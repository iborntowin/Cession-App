import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { storageService } from '../utils/storage';
import { validateExportData } from '../utils/dataValidation';
import { 
  NetworkError, 
  ValidationError, 
  CacheError, 
  DataSyncError,
  ErrorHandler,
  RetryHandler 
} from '../utils/errorHandling';

// Constants for data management
const DATA_CACHE_KEY = 'app_data';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const DATA_VERSION_KEY = 'data_version';
const SYNC_RETRY_ATTEMPTS = 3;
const SYNC_RETRY_DELAY = 2000; // 2 seconds
const DATA_FRESHNESS_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class DataService {
  constructor() {
    this.isOnline = true;
    this.isSyncing = false;
    this.syncListeners = [];
    this.errorListeners = [];
    
    // Initialize network monitoring
    if (typeof NetInfo !== 'undefined') {
      this.initializeNetworkMonitoring();
    }
  }

  /**
   * Initialize network connectivity monitoring
   */
  initializeNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      // Auto-sync when coming back online
      if (!wasOnline && this.isOnline) {
        this.syncData().catch(error => {
          console.warn('Auto-sync failed after coming online:', error);
        });
      }
    });
  }

  /**
   * Add listener for sync status changes
   */
  addSyncListener(listener) {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync listener
   */
  removeSyncListener(listener) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  /**
   * Add listener for error events
   */
  addErrorListener(listener) {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener) {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  /**
   * Notify sync listeners of status changes
   */
  notifySyncListeners(status, data = null) {
    this.syncListeners.forEach(listener => {
      try {
        listener(status, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Notify error listeners
   */
  notifyErrorListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  /**
   * Fetch latest data from Supabase public URL
   */
  async fetchLatestData(publicUrl) {
    if (!publicUrl) {
      throw new ValidationError('Public URL is required');
    }

    try {
      const response = await axios.get(publicUrl, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.data) {
        throw new NetworkError('No data received from server');
      }

      // Validate the data structure using utility
      const validation = validateExportData(response.data);
      if (!validation.isValid) {
        throw new ValidationError('Invalid data structure received', validation.errors);
      }
      
      return response.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new NetworkError('Request timeout - please check your connection', error);
      } else if (error.response) {
        throw new NetworkError(`Server error: ${error.response.status} - ${error.response.statusText}`, error);
      } else if (error.request) {
        throw new NetworkError('Network error - please check your connection', error);
      } else {
        throw new NetworkError(error.message || 'Unknown network error', error);
      }
    }
  }

  /**
   * Get cached data from local storage
   */
  async getCachedData() {
    try {
      const cachedData = await storageService.getItem(DATA_CACHE_KEY);
      
      if (!cachedData) {
        return null;
      }

      // Validate cached data structure using utility
      const validation = validateExportData(cachedData);
      if (!validation.isValid) {
        throw new ValidationError('Cached data is corrupted', validation.errors);
      }
      
      return cachedData;
    } catch (error) {
      ErrorHandler.logError(error, 'Getting cached data');
      // Clear corrupted cache
      await this.clearCache().catch(clearError => {
        ErrorHandler.logError(clearError, 'Clearing corrupted cache');
      });
      return null;
    }
  }

  /**
   * Cache data to local storage
   */
  async cacheData(data) {
    try {
      // Validate data before caching using utility
      const validation = validateExportData(data);
      if (!validation.isValid) {
        throw new ValidationError('Cannot cache invalid data', validation.errors);
      }
      
      await storageService.setItem(DATA_CACHE_KEY, data);
      await storageService.setItem(LAST_SYNC_KEY, Date.now());
      
      // Store data version if available
      if (data.metadata && data.metadata.version) {
        await storageService.setItem(DATA_VERSION_KEY, data.metadata.version);
      }
      
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      ErrorHandler.logError(error, 'Caching data');
      throw new CacheError(`Failed to cache data: ${error.message}`, error);
    }
  }

  /**
   * Synchronize data with retry logic
   */
  async syncData(publicUrl, forceSync = false) {
    if (this.isSyncing && !forceSync) {
      return { success: false, message: 'Sync already in progress' };
    }

    if (!this.isOnline) {
      return { success: false, message: 'No internet connection' };
    }

    this.isSyncing = true;
    this.notifySyncListeners('syncing');

    try {
      const result = await RetryHandler.withRetry(
        async () => {
          const data = await this.fetchLatestData(publicUrl);
          await this.cacheData(data);
          return data;
        },
        {
          maxAttempts: SYNC_RETRY_ATTEMPTS,
          baseDelay: SYNC_RETRY_DELAY,
          shouldRetry: (error, attempt, maxAttempts) => {
            return ErrorHandler.shouldRetry(error, attempt, maxAttempts);
          },
          onRetry: (error, attempt, delay) => {
            ErrorHandler.logError(error, `Sync attempt ${attempt}/${SYNC_RETRY_ATTEMPTS}`, { nextRetryIn: delay });
          }
        }
      );

      this.isSyncing = false;
      this.notifySyncListeners('success', result);
      
      return { 
        success: true, 
        data: result, 
        timestamp: Date.now(),
        message: 'Data synchronized successfully' 
      };
      
    } catch (error) {
      this.isSyncing = false;
      const syncError = new DataSyncError(`Sync failed after ${SYNC_RETRY_ATTEMPTS} attempts: ${error.message}`, SYNC_RETRY_ATTEMPTS, error);
      
      this.notifySyncListeners('error', syncError);
      this.notifyErrorListeners(syncError);
      
      return { 
        success: false, 
        error: syncError,
        message: syncError.message
      };
    }
  }

  /**
   * Get data with automatic fallback to cache
   */
  async getData(publicUrl, options = {}) {
    const { preferCache = false, maxAge = DATA_FRESHNESS_THRESHOLD } = options;
    
    try {
      // Check if we should try to fetch fresh data
      let syncError = null;
      if (!preferCache && this.isOnline) {
        const syncResult = await this.syncData(publicUrl);
        if (syncResult.success) {
          return {
            data: syncResult.data,
            source: 'network',
            timestamp: syncResult.timestamp,
            isStale: false
          };
        } else {
          syncError = syncResult.error;
        }
      }
      
      // Fallback to cached data
      const cachedData = await this.getCachedData();
      if (cachedData) {
        const lastSync = await this.getLastSyncTime();
        const isStale = lastSync ? (Date.now() - lastSync) > maxAge : true;
        
        const result = {
          data: cachedData,
          source: 'cache',
          timestamp: lastSync,
          isStale
        };
        
        // Include error if sync failed
        if (syncError) {
          result.error = syncError.message || syncError.toString();
        }
        
        return result;
      }
      
      // No data available
      throw new Error('No data available - please check your connection and try again');
      
    } catch (error) {
      // Try to return cached data as last resort
      const cachedData = await this.getCachedData();
      if (cachedData) {
        const lastSync = await this.getLastSyncTime();
        return {
          data: cachedData,
          source: 'cache',
          timestamp: lastSync,
          isStale: true,
          error: error.message
        };
      }
      
      throw error;
    }
  }

  /**
   * Get last synchronization timestamp
   */
  async getLastSyncTime() {
    try {
      return await storageService.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Check if data is fresh (within threshold)
   */
  async isDataFresh(maxAge = DATA_FRESHNESS_THRESHOLD) {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return false;
    
    return (Date.now() - lastSync) <= maxAge;
  }

  /**
   * Get data version
   */
  async getDataVersion() {
    try {
      return await storageService.getItem(DATA_VERSION_KEY);
    } catch (error) {
      console.error('Error getting data version:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    try {
      await storageService.removeItem(DATA_CACHE_KEY);
      await storageService.removeItem(LAST_SYNC_KEY);
      await storageService.removeItem(DATA_VERSION_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw new Error(`Failed to clear cache: ${error.message}`);
    }
  }



  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync status information
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.getLastSyncTime(),
      dataVersion: this.getDataVersion()
    };
  }

  /**
   * Force manual sync
   */
  async forceSync(publicUrl) {
    return await this.syncData(publicUrl, true);
  }
}

export const dataService = new DataService();
export default dataService;
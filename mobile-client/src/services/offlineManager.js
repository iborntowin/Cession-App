import NetInfo from '@react-native-community/netinfo';
import { storageService } from '../utils/storage';
import { dataService } from './DataService';
import { supabaseService } from './supabaseService';
import { ErrorHandler } from '../utils/errorHandling';

/**
 * Comprehensive offline data manager for the mobile client
 * Handles connectivity changes, data synchronization, and offline fallbacks
 */
class OfflineManager {
  constructor() {
    this.isOnline = true;
    this.connectionType = 'unknown';
    this.listeners = [];
    this.syncInProgress = false;
    this.lastSyncAttempt = null;
    this.autoSyncEnabled = true;
    this.syncInterval = null;
    
    // Storage keys
    this.OFFLINE_STATUS_KEY = 'offline_manager_status';
    this.SYNC_QUEUE_KEY = 'sync_queue';
    this.LAST_ONLINE_KEY = 'last_online_timestamp';
    
    this.initialize();
  }

  /**
   * Initialize the offline manager
   */
  async initialize() {
    try {
      // Load cached status
      await this.loadCachedStatus();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Set up periodic sync
      this.setupPeriodicSync();
      
      // Initial connectivity check
      await this.checkConnectivity();
      
      console.log('OfflineManager initialized successfully');
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to initialize OfflineManager');
    }
  }

  /**
   * Set up network connectivity monitoring
   */
  setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      this.connectionType = state.type;
      
      console.log(`Network state changed: ${this.isOnline ? 'Online' : 'Offline'} (${this.connectionType})`);
      
      // Handle connectivity changes
      this.handleConnectivityChange(wasOnline, this.isOnline);
      
      // Notify listeners
      this.notifyListeners({
        type: 'connectivity',
        isOnline: this.isOnline,
        connectionType: this.connectionType,
        wasOnline
      });
    });
  }

  /**
   * Handle connectivity changes
   */
  async handleConnectivityChange(wasOnline, isOnline) {
    try {
      if (!wasOnline && isOnline) {
        // Coming back online
        console.log('Device came back online - triggering sync');
        await storageService.setItem(this.LAST_ONLINE_KEY, Date.now());
        
        if (this.autoSyncEnabled) {
          // Wait a moment for connection to stabilize
          setTimeout(() => {
            this.syncWhenOnline();
          }, 2000);
        }
      } else if (wasOnline && !isOnline) {
        // Going offline
        console.log('Device went offline');
        this.cancelPeriodicSync();
      }
      
      // Save status
      await this.saveCachedStatus();
    } catch (error) {
      ErrorHandler.logError(error, 'Error handling connectivity change');
    }
  }

  /**
   * Check current connectivity status
   */
  async checkConnectivity() {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected && state.isInternetReachable;
      this.connectionType = state.type;
      
      return {
        isOnline: this.isOnline,
        connectionType: this.connectionType,
        details: state
      };
    } catch (error) {
      ErrorHandler.logError(error, 'Error checking connectivity');
      return {
        isOnline: false,
        connectionType: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Sync data when online
   */
  async syncWhenOnline() {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, message: 'Not online or sync in progress' };
    }

    this.syncInProgress = true;
    this.lastSyncAttempt = Date.now();

    try {
      console.log('Starting data sync...');
      
      // Notify listeners that sync is starting
      this.notifyListeners({
        type: 'sync',
        status: 'starting'
      });

      // Try to refresh Supabase connection and get latest data
      await supabaseService.checkConnection();
      const data = await supabaseService.getCurrentData();
      
      if (data && data.clients) {
        // Cache the data using DataService
        await dataService.cacheData(data);
        
        console.log(`Sync completed successfully: ${data.clients.length} clients`);
        
        // Notify listeners of successful sync
        this.notifyListeners({
          type: 'sync',
          status: 'success',
          data: {
            clientCount: data.clients.length,
            cessionCount: data.cessions?.length || 0,
            timestamp: Date.now()
          }
        });

        return {
          success: true,
          message: 'Data synchronized successfully',
          clientCount: data.clients.length,
          cessionCount: data.cessions?.length || 0
        };
      } else {
        throw new Error('No data received from server');
      }
    } catch (error) {
      ErrorHandler.logError(error, 'Sync failed');
      
      // Notify listeners of sync failure
      this.notifyListeners({
        type: 'sync',
        status: 'error',
        error: error.message
      });

      return {
        success: false,
        message: error.message,
        error
      };
    } finally {
      this.syncInProgress = false;
      await this.saveCachedStatus();
    }
  }

  /**
   * Get data with offline fallback
   */
  async getData(options = {}) {
    const { preferCache = false, maxAge = 24 * 60 * 60 * 1000 } = options;
    
    try {
      // If online and not preferring cache, try to get fresh data
      if (this.isOnline && !preferCache) {
        try {
          const syncResult = await this.syncWhenOnline();
          if (syncResult.success) {
            const cachedData = await dataService.getCachedData();
            return {
              data: cachedData,
              source: 'network',
              timestamp: Date.now(),
              isStale: false,
              syncResult
            };
          }
        } catch (syncError) {
          console.warn('Failed to sync, falling back to cache:', syncError.message);
        }
      }
      
      // Try to get cached data
      const cachedData = await dataService.getCachedData();
      if (cachedData) {
        const lastSync = await dataService.getLastSyncTime();
        const isStale = lastSync ? (Date.now() - lastSync) > maxAge : true;
        
        return {
          data: cachedData,
          source: 'cache',
          timestamp: lastSync,
          isStale,
          isOnline: this.isOnline
        };
      }
      
      // No data available
      throw new Error('No data available - please check your connection and try again');
      
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to get data');
      throw error;
    }
  }

  /**
   * Force a manual sync
   */
  async forceSync() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    return await this.syncWhenOnline();
  }

  /**
   * Set up periodic sync when online
   */
  setupPeriodicSync(intervalMinutes = 30) {
    this.cancelPeriodicSync();
    
    if (this.autoSyncEnabled) {
      this.syncInterval = setInterval(() => {
        if (this.isOnline && !this.syncInProgress) {
          console.log('Performing periodic sync...');
          this.syncWhenOnline();
        }
      }, intervalMinutes * 60 * 1000);
    }
  }

  /**
   * Cancel periodic sync
   */
  cancelPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Enable or disable auto-sync
   */
  setAutoSync(enabled) {
    this.autoSyncEnabled = enabled;
    
    if (enabled) {
      this.setupPeriodicSync();
    } else {
      this.cancelPeriodicSync();
    }
  }

  /**
   * Get offline status information
   */
  async getStatus() {
    const lastSync = await dataService.getLastSyncTime();
    const lastOnline = await storageService.getItem(this.LAST_ONLINE_KEY);
    const cachedData = await dataService.getCachedData();
    
    return {
      isOnline: this.isOnline,
      connectionType: this.connectionType,
      syncInProgress: this.syncInProgress,
      lastSyncAttempt: this.lastSyncAttempt,
      lastSuccessfulSync: lastSync,
      lastOnline,
      autoSyncEnabled: this.autoSyncEnabled,
      hasCachedData: !!cachedData,
      cachedDataAge: lastSync ? Date.now() - lastSync : null
    };
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    try {
      await dataService.clearCache();
      await storageService.removeItem(this.OFFLINE_STATUS_KEY);
      await storageService.removeItem(this.SYNC_QUEUE_KEY);
      
      console.log('Cache cleared successfully');
      
      this.notifyListeners({
        type: 'cache',
        status: 'cleared'
      });
      
      return true;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to clear cache');
      throw error;
    }
  }

  /**
   * Add listener for offline manager events
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Remove listener
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        ErrorHandler.logError(error, 'Error in offline manager listener');
      }
    });
  }

  /**
   * Save cached status
   */
  async saveCachedStatus() {
    try {
      const status = {
        isOnline: this.isOnline,
        connectionType: this.connectionType,
        lastSyncAttempt: this.lastSyncAttempt,
        autoSyncEnabled: this.autoSyncEnabled,
        timestamp: Date.now()
      };
      
      await storageService.setItem(this.OFFLINE_STATUS_KEY, status);
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to save cached status');
    }
  }

  /**
   * Load cached status
   */
  async loadCachedStatus() {
    try {
      const status = await storageService.getItem(this.OFFLINE_STATUS_KEY);
      if (status) {
        this.lastSyncAttempt = status.lastSyncAttempt;
        this.autoSyncEnabled = status.autoSyncEnabled !== false; // Default to true
      }
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to load cached status');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.cancelPeriodicSync();
    this.listeners = [];
  }
}

// Create and export singleton instance
export const offlineManager = new OfflineManager();
export default offlineManager;
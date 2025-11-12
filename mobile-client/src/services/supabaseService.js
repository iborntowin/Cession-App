import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorHandler } from '../utils/errorHandling';

class SupabaseService {
  constructor() {
    // Supabase configuration
    this.supabaseUrl = 'https://ahqtluebfvzvddyjlbqf.supabase.co';
    this.bucketName = 'mobile-exports';
    // Service role key for accessing Supabase (if needed for file listing)
    this.serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocXRsdWViZnZ6dmRkeWpsYnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk0MzEyNywiZXhwIjoyMDY0NTE5MTI3fQ.UK47VG5WVDSO4ifXYAHG2eb0rDVD89Hro0lVJsG4auk';

    this.connectionStatus = {
      isConnected: false,
      lastChecked: null,
      lastDataUpdate: null,
      error: null,
      availableFiles: [],
      selectedFile: null,
      mode: 'automatic' // 'automatic' or 'manual'
    };
    this.listeners = [];
  }

  /**
   * Initialize the service and check connection
   */
  async initialize() {
    try {
      await this.checkConnection();
      await this.loadCachedStatus();
      return true;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to initialize Supabase service');
      return false;
    }
  }

  /**
   * Check connection to Supabase and update status
   */
  async checkConnection() {
    const startTime = Date.now();
    try {

      // Use direct Supabase access only (no backend dependency)
      let latestFile = null;
      let filesCount = 0;

      console.log('Connecting directly to Supabase Storage...');
      
      try {
        // List all files in the bucket to find actual export files
        const allFiles = await this.listAllFiles();
        if (allFiles.length > 0) {
          console.log('Found files in bucket:', allFiles.map(f => f.name));
          
          // Look for export files with any of the known patterns
          const exportFiles = allFiles.filter(f => f.name && (
            f.name.startsWith('export-') ||
            f.name.startsWith('mobile-export_') ||
            f.name.includes('export')
          ) && f.name.endsWith('.json'));
          
          if (exportFiles.length > 0) {
            // Sort by created_at to get the most recent
            exportFiles.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            latestFile = exportFiles[0].name;
            filesCount = exportFiles.length;
            console.log(`Using most recent export file: ${latestFile}`);
          }
        } else {
          console.log('No files found in bucket');
        }
      } catch (supabaseError) {
        throw new Error(`Supabase not reachable: ${supabaseError.message}`);
      }

      // Get available files list for archive functionality
      const availableFiles = await this.getAvailableFiles();

      const responseTime = Date.now() - startTime;

      // Connection is successful if we can reach Supabase or backend
      this.connectionStatus = {
        isConnected: true,
        status: latestFile ? 'Connected' : 'Connected (No Data)',
        statusColor: latestFile ? '#4CAF50' : '#FF9800',
        lastChecked: new Date().toISOString(),
        responseTime,
        error: latestFile ? null : 'No export files found yet - waiting for first export',
        filesCount: availableFiles.length,
        latestFile,

        lastDataUpdate: latestFile ? new Date().toISOString() : null,
        hasData: !!latestFile,
        availableFiles,
        selectedFile: this.connectionStatus.selectedFile || latestFile,
        mode: this.connectionStatus.mode || 'automatic'
      };

      await this.saveCachedStatus();
      this.notifyListeners();
      return true;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.connectionStatus = {
        isConnected: false,
        status: 'Disconnected',
        statusColor: '#FF5722',
        lastChecked: new Date().toISOString(),
        error: error.message,
        responseTime,
        hasData: false,
        availableFiles: [],
        selectedFile: null,
        mode: this.connectionStatus.mode || 'automatic'
      };

      await this.saveCachedStatus();
      this.notifyListeners();
      ErrorHandler.logError(error, 'Supabase connection check failed');
      return false;
    }
  }

  /**
   * Get list of available export files from Supabase using Supabase Storage API
   */
  async getAvailableFiles() {
    try {
      // First try to use Supabase Storage API to list files
      const listUrl = `${this.supabaseUrl}/storage/v1/object/list/${this.bucketName}`;

      try {
        const listResponse = await fetch(listUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.serviceRoleKey}`,
            'Content-Type': 'application/json',
            'apikey': this.serviceRoleKey
          },
          body: JSON.stringify({
            limit: 10,
            prefix: '',
            sortBy: { column: 'created_at', order: 'desc' }
          }),
          timeout: 10000
        });

        if (listResponse.ok) {
          const files = await listResponse.json();
          const exportFiles = files
            .filter(file => file.name &&
              (file.name.startsWith('mobile-export_') || file.name.startsWith('export-')) &&
              file.name.endsWith('.json'))
            .slice(0, 5) // Get more files to check
            .map(file => ({
              fileName: file.name,
              timestamp: this.extractTimestampFromFileName(file.name),
              createdAt: new Date(file.created_at || file.updated_at),
              url: `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${file.name}`,
              size: file.metadata?.size || 0
            }));

          console.log(`Found ${exportFiles.length} export files via Storage API`);

          // If we found files through the Storage API, return them immediately
          // This prevents the fallback logic from executing
          if (exportFiles.length > 0) {
            return exportFiles;
          }
        }
      } catch (apiError) {
        console.log('Storage API not available, trying direct file detection:', apiError.message);
      }

      // Fallback: Return empty array if Storage API failed
      // The Storage API should have found the files, so this is just a safety fallback
      console.log('Storage API failed, returning empty array');
      return [];

    } catch (error) {
      console.log('Error getting available files:', error.message);
      return [];
    }
  }

  /**
   * Extract timestamp from filename - handles both patterns:
   * - "export-1752596070631.json" (millisecond timestamp)
   * - "mobile-export_2024-01-15_14-30-45.json" (backend format)
   */
  extractTimestampFromFileName(fileName) {
    // Try millisecond timestamp pattern first: export-1752596070631.json
    const timestampMatch = fileName.match(/export-(\d+)\.json/);
    if (timestampMatch) {
      return parseInt(timestampMatch[1]);
    }

    // Try backend datetime pattern: mobile-export_2024-01-15_14-30-45.json
    const datetimeMatch = fileName.match(/mobile-export_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.json/);
    if (datetimeMatch) {
      const [, year, month, day, hour, minute, second] = datetimeMatch;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      return date.getTime();
    }

    // Fallback to current time for unknown patterns
    return Date.now();
  }

  /**
   * Get the latest data file from Supabase
   */
  async getLatestDataFile() {
    try {
      if (!this.connectionStatus.isConnected) {
        await this.checkConnection();
      }

      // If no data files are available yet, return empty data structure
      if (!this.connectionStatus.latestFile) {
        ErrorHandler.logError(new Error('No export files found'), 'No data files available - using empty data structure');

        // Try to return cached data first
        const cachedData = await this.getCachedData();
        if (cachedData) {
          return cachedData;
        }

        // Return empty data structure if no cache
        return {
          clients: [],
          cessions: [],
          exportTimestamp: new Date().toISOString(),
          message: 'No data exported yet. Please trigger an export from the backend.'
        };
      }

      // Construct Supabase URL directly
      const fileUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${this.connectionStatus.latestFile}`;
      console.log(`Using Supabase URL: ${fileUrl}`);

      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout for data download
      });

      if (response.ok) {
        const data = await response.json();

        // Transform data if needed - the backend exports in a specific format
        let transformedData;
        if (data.metadata && data.clients) {
          // Backend export format
          transformedData = {
            clients: data.clients || [],
            cessions: this.extractCessionsFromClients(data.clients || []),
            payments: data.payments || [],
            exportTimestamp: data.metadata.exportTimestamp || new Date().toISOString(),
            recordCount: data.metadata.recordCount || {}
          };
        } else {
          // Legacy format or direct format
          transformedData = data;
        }

        // Cache the transformed data locally
        await AsyncStorage.setItem('cached_data', JSON.stringify(transformedData));
        await AsyncStorage.setItem('cached_data_timestamp', new Date().toISOString());

        return transformedData;
      } else {
        throw new Error(`Failed to fetch data: HTTP ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to get latest data file');

      // Try to return cached data
      const cachedData = await this.getCachedData();
      if (cachedData) {
        return cachedData;
      }

      // Return empty data structure as last resort
      return {
        clients: [],
        cessions: [],
        exportTimestamp: new Date().toISOString(),
        message: 'Unable to fetch data. Please check your connection and try again.',
        error: error.message
      };
    }
  }

  /**
   * Extract all cessions from clients for easier access
   */
  extractCessionsFromClients(clients) {
    const allCessions = [];
    clients.forEach(client => {
      if (client.cessions && Array.isArray(client.cessions)) {
        client.cessions.forEach(cession => {
          allCessions.push({
            ...cession,
            clientId: client.id,
            clientName: client.fullName
          });
        });
      }
    });
    return allCessions;
  }

  /**
   * Get cached data from local storage
   */
  async getCachedData() {
    try {
      const cachedData = await AsyncStorage.getItem('cached_data');
      const cachedTimestamp = await AsyncStorage.getItem('cached_data_timestamp');

      if (cachedData) {
        return {
          data: JSON.parse(cachedData),
          cachedAt: cachedTimestamp,
          isFromCache: true
        };
      }

      return null;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to get cached data');
      return null;
    }
  }

  /**
   * Check if cached data is fresh (less than 1 hour old)
   */
  async isCachedDataFresh() {
    try {
      const cachedTimestamp = await AsyncStorage.getItem('cached_data_timestamp');
      if (!cachedTimestamp) return false;

      const cachedTime = new Date(cachedTimestamp);
      const now = new Date();
      const hoursDiff = (now - cachedTime) / (1000 * 60 * 60);

      return hoursDiff < 1; // Fresh if less than 1 hour old
    } catch (error) {
      return false;
    }
  }

  

  /**
   * Get data freshness information
   */
  async getDataFreshness() {
    try {
      const cachedTimestamp = await AsyncStorage.getItem('cached_data_timestamp');
      const lastDataUpdate = this.connectionStatus.lastDataUpdate;

      return {
        cachedAt: cachedTimestamp,
        serverUpdatedAt: lastDataUpdate,
        isFresh: await this.isCachedDataFresh(),
        isConnected: this.connectionStatus.isConnected
      };
    } catch (error) {
      return {
        cachedAt: null,
        serverUpdatedAt: null,
        isFresh: false,
        isConnected: false
      };
    }
  }

  /**
   * Force refresh data from server
   */
  async refreshData() {
    try {
      await this.checkConnection();
      if (this.connectionStatus.isConnected) {
        return await this.getLatestDataFile();
      } else {
        throw new Error('Not connected to Supabase');
      }
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to refresh data');
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return { ...this.connectionStatus };
  }

  /**
   * Add listener for connection status changes
   */
  addStatusListener(listener = () => {}) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of status changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.connectionStatus);
      } catch (error) {
        ErrorHandler.logError(error, 'Error in status listener');
      }
    });
  }

  /**
   * Save connection status to cache
   */
  async saveCachedStatus() {
    try {
      await AsyncStorage.setItem('supabase_status', JSON.stringify(this.connectionStatus));
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to save cached status');
    }
  }

  /**
   * Load connection status from cache
   */
  async loadCachedStatus() {
    try {
      const cachedStatus = await AsyncStorage.getItem('supabase_status');
      if (cachedStatus) {
        const status = JSON.parse(cachedStatus);
        // Only use cached status if it's recent (less than 5 minutes old)
        if (status.lastChecked) {
          const lastChecked = new Date(status.lastChecked);
          const now = new Date();
          const minutesDiff = (now - lastChecked) / (1000 * 60);

          if (minutesDiff < 5) {
            this.connectionStatus = { ...status };
          }
        }
      }
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to load cached status');
    }
  }

  /**
   * Start periodic connection checks
   */
  startPeriodicChecks(intervalMinutes = 5) {
    // Check connection every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic connection checks
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }



  /**
   * Set the mode (automatic or manual)
   */
  async setMode(mode) {
    try {
      this.connectionStatus.mode = mode;

      if (mode === 'automatic') {
        // In automatic mode, always use the latest file
        this.connectionStatus.selectedFile = this.connectionStatus.latestFile;
      }

      await this.saveCachedStatus();
      this.notifyListeners();

      console.log(`Mode set to: ${mode}`);
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to set mode');
    }
  }

  /**
   * Select a specific file (only works in manual mode)
   */
  async selectFile(fileName) {
    try {
      if (this.connectionStatus.mode !== 'manual') {
        throw new Error('File selection is only available in manual mode');
      }

      // Verify the file exists in available files
      const fileExists = this.connectionStatus.availableFiles.some(f => f.fileName === fileName);
      if (!fileExists) {
        throw new Error('Selected file is not available');
      }

      this.connectionStatus.selectedFile = fileName;
      await this.saveCachedStatus();
      this.notifyListeners();

      console.log(`File selected: ${fileName}`);
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to select file');
      throw error;
    }
  }

  /**
   * Get the currently selected file for data loading
   */
  getSelectedFile() {
    if (this.connectionStatus.mode === 'automatic') {
      return this.connectionStatus.latestFile;
    } else {
      return this.connectionStatus.selectedFile || this.connectionStatus.latestFile;
    }
  }

  /**
   * Get data from a specific file
   */
  async getDataFromFile(fileName) {
    try {
      if (!fileName) {
        throw new Error('No file specified');
      }

      const fileUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${fileName}`;
      console.log(`Loading data from: ${fileUrl}`);

      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000
      });

      if (response.ok) {
        const data = await response.json();

        // Transform data if needed - the backend exports in a specific format
        let transformedData;
        if (data.metadata && data.clients) {
          // Backend export format
          transformedData = {
            clients: data.clients || [],
            cessions: this.extractCessionsFromClients(data.clients || []),
            payments: data.payments || [],
            workplaces: data.workplaces || [],
            jobs: data.jobs || [],
            exportTimestamp: data.metadata.exportTimestamp || data.metadata.exportTime || new Date().toISOString(),
            recordCount: data.metadata.recordCount || {},
            fileName: fileName
          };
        } else if (data.clients) {
          // Direct format with clients array
          transformedData = {
            clients: data.clients || [],
            cessions: this.extractCessionsFromClients(data.clients || []),
            payments: data.payments || [],
            workplaces: data.workplaces || [],
            jobs: data.jobs || [],
            exportTimestamp: data.exportTimestamp || data.exportTime || new Date().toISOString(),
            fileName: fileName
          };
        } else {
          // Legacy format or unknown format
          transformedData = {
            clients: Array.isArray(data) ? data : [],
            cessions: [],
            payments: [],
            workplaces: [],
            jobs: [],
            exportTimestamp: new Date().toISOString(),
            fileName: fileName
          };
        }

        // Validate that we have usable data
        if (!transformedData.clients || !Array.isArray(transformedData.clients)) {
          throw new Error(`Invalid data format in ${fileName}: clients is not an array`);
        }

        if (transformedData.clients.length === 0) {
          console.warn(`Warning: ${fileName} contains no client data`);
        }

        console.log(`Successfully loaded ${transformedData.clients.length} clients from ${fileName}`);
        return transformedData;
      } else {
        throw new Error(`Failed to fetch data from ${fileName}: HTTP ${response.status}`);
      }
    } catch (error) {
      ErrorHandler.logError(error, `Failed to get data from file: ${fileName}`);
      throw error;
    }
  }

  /**
   * Get data based on current mode and selection
   */
  async getCurrentData() {
    try {
      // Always try to load local test data first for debugging
      console.log('Attempting to load local test data...');
      try {
        const localData = await this.loadLocalTestData();
        if (localData && localData.cessions && localData.cessions.length > 0) {
          console.log(`Successfully loaded local test data with ${localData.cessions.length} cessions`);
          return localData;
        } else {
          console.log('Local test data loaded but no cessions found:', localData?.cessions?.length || 0);
        }
      } catch (localError) {
        console.log('Local test data loading failed:', localError.message);
      }

      const selectedFile = this.getSelectedFile();

      if (!selectedFile) {
        // Try to return cached data first
        const cachedData = await this.getCachedData();
        if (cachedData) {
          return cachedData;
        }

        // Return empty data structure if no cache
        throw new Error('No data files available. Please check connection or trigger an export from the backend.');
      }

      const data = await this.getDataFromFile(selectedFile);

      // Cache the data locally
      await AsyncStorage.setItem('cached_data', JSON.stringify(data));
      await AsyncStorage.setItem('cached_data_timestamp', new Date().toISOString());

      return data;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to get current data');

      // Try to return cached data as fallback
      const cachedData = await this.getCachedData();
      if (cachedData) {
        return cachedData;
      }

      // Throw error as last resort to trigger proper error handling
      throw new Error(`Unable to fetch data: ${error.message}. Please check your connection and try again.`);
    }
  }

  /**
   * List all files in the bucket using Storage API
   */
  async listAllFiles() {
    try {
      const listUrl = `${this.supabaseUrl}/storage/v1/object/list/${this.bucketName}`;
      
      const listResponse = await fetch(listUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': this.serviceRoleKey
        },
        body: JSON.stringify({
          limit: 100,
          prefix: '',
          sortBy: { column: 'created_at', order: 'desc' }
        }),
        timeout: 10000
      });

      if (listResponse.ok) {
        const files = await listResponse.json();
        return files || [];
      } else {
        console.log('Failed to list files:', listResponse.status);
        return [];
      }
    } catch (error) {
      console.log('Error listing files:', error.message);
      return [];
    }
  }

  /**
   * Load local test data for development
   */
  async loadLocalTestData() {
    try {
      console.log('Loading local test data...');
      // Try to load local test data dynamically
      let localData = null;
      try {
        console.log('Trying dynamic import...');
        // Use dynamic import for the JSON file
        const module = await import('../../data_exemple/mobile-export_2025-11-11_08-16-27.json');
        localData = module.default || module;
        console.log('Dynamic import successful');
      } catch (importError) {
        console.log('Dynamic import failed, trying require:', importError.message);
        try {
          localData = require('../../data_exemple/mobile-export_2025-11-11_08-16-27.json');
          console.log('Require successful');
        } catch (requireError) {
          console.log('Require also failed:', requireError.message);
          return null;
        }
      }

      if (!localData) {
        console.log('Local test data is null/undefined');
        return null;
      }

      console.log('Local data loaded, checking structure...');
      console.log('Local data keys:', Object.keys(localData));
      console.log('Local data has payments:', !!localData.payments);
      console.log('Local data payments count:', localData.payments ? localData.payments.length : 0);

      console.log('Local data loaded, extracting cessions...');
      const extractedCessions = this.extractCessionsFromClients(localData.clients || []);
      console.log(`Extracted ${extractedCessions.length} cessions from ${localData.clients?.length || 0} clients`);

      // Transform the data to match expected format
      const transformedData = {
        clients: localData.clients || [],
        cessions: extractedCessions,
        payments: localData.payments || [],
        workplaces: localData.workplaces || [],
        jobs: localData.jobs || [],
        exportTimestamp: localData.metadata?.exportTimestamp || new Date().toISOString(),
        recordCount: localData.metadata?.recordCount || {},
        fileName: 'local-test-data.json',
        isFromLocalFile: true
      };

      console.log(`Final data: ${transformedData.clients.length} clients, ${transformedData.cessions.length} cessions, ${transformedData.payments.length} payments`);
      return transformedData;
    } catch (error) {
      console.log('Failed to load local test data:', error.message);
      return null;
    }
  }
}

// Create and export singleton instance
export const supabaseService = new SupabaseService();
export default supabaseService;
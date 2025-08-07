import { apiService } from './apiService';
import { dataService } from './DataService';
import { supabaseService } from './supabaseService';
import { 
  ErrorHandler, 
  RetryHandler, 
  CircuitBreaker, 
  gracefulDegradation,
  NetworkError,
  DataSyncError,
  CacheError
} from '../utils/errorHandling';

class ClientService {
  constructor() {
    // Initialize with automatic Supabase connection
    this.isInitialized = false;
    this.initializeService();
    
    // Initialize circuit breakers for different operations
    this.supabaseCircuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 10000 // 10 seconds
    });
    
    this.apiCircuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 15000 // 15 seconds
    });
  }

  /**
   * Initialize the service with automatic Supabase connection
   */
  async initializeService() {
    try {
      await supabaseService.initialize();
      this.isInitialized = true;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to initialize ClientService');
    }
  }

  /**
   * Safely cache data without throwing errors
   */
  async safeCacheData(result) {
    try {
      // Validate input data
      if (!result || typeof result !== 'object') {
        ErrorHandler.logError(
          new CacheError('Invalid data structure for caching'), 
          'safeCacheData - invalid input'
        );
        return false;
      }

      // Ensure the data has the expected structure for caching
      const dataToCache = {
        metadata: result.metadata || {
          exportTime: result.exportTimestamp || new Date().toISOString(),
          version: "1.0",
          recordCount: {
            clients: result.clients?.length || 0,
            cessions: result.cessions?.length || 0
          }
        },
        clients: result.clients || []
      };
      
      // Only cache if we have valid data
      if (dataToCache.clients && Array.isArray(dataToCache.clients)) {
        await dataService.cacheData(dataToCache);
        return true;
      } else {
        ErrorHandler.logError(
          new CacheError('No valid client data to cache'), 
          'safeCacheData - no valid data'
        );
        return false;
      }
    } catch (error) {
      // Log the error but don't throw it - this is supposed to be "safe"
      ErrorHandler.logError(
        new CacheError('Failed to cache client data', error), 
        'safeCacheData - cache operation failed'
      );
      return false;
    }
  }

  /**
   * Set the Supabase public URL for data fetching (legacy method for backward compatibility)
   */
  setPublicUrl(publicUrl) {
    // This method is kept for backward compatibility but is no longer needed
    // as we now use automatic Supabase connection
  }

  /**
   * Get all clients from Supabase export data with automatic connection and offline support
   */
  async getAllClients() {
    return await RetryHandler.withRetry(
      async () => {
        // Ensure service is initialized
        if (!this.isInitialized) {
          await this.initializeService();
        }

        // Use graceful degradation with circuit breaker
        return await gracefulDegradation(
          // Primary operation: Get data from Supabase
          async () => {
            return await this.supabaseCircuitBreaker.execute(
              async () => {
                const result = await supabaseService.getCurrentData();
                
                if (!result || !result.clients) {
                  throw new DataSyncError('No client data found in export', 0);
                }

                // Cache the data for offline use - but don't fail if caching fails
                try {
                  await this.safeCacheData(result);
                } catch (cacheError) {
                  // This should not happen since safeCacheData is supposed to be safe
                  // but we'll handle it just in case
                  ErrorHandler.logError(cacheError, 'getAllClients - unexpected cache error');
                }

                return result.clients;
              },
              // Circuit breaker fallback: Use cached data
              async () => {
                const cachedResult = await supabaseService.getCachedData();
                if (cachedResult && cachedResult.data) {
                  const data = cachedResult.data.data || cachedResult.data;
                  if (data.clients) {
                    return data.clients;
                  }
                }
                throw new DataSyncError('No cached Supabase data available', 0);
              }
            );
          },
          
          // Fallback operation: Get from local cache or API
          async () => {
            // Try local cache first
            try {
              const cachedData = await dataService.getCachedData();
              if (cachedData && cachedData.clients) {
                ErrorHandler.logError(
                  new DataSyncError('Using local cached data as fallback', 0), 
                  'getAllClients - fallback to cache'
                );
                return cachedData.clients;
              }
            } catch (cacheError) {
              ErrorHandler.logError(new CacheError('Failed to get cached data', cacheError), 
                'getAllClients - cache fallback');
            }

            // Final fallback: Try API
            return await this.apiCircuitBreaker.execute(
              async () => {
                const response = await apiService.get('/clients');
                const clients = response.data || response;
                
                if (!clients || !Array.isArray(clients)) {
                  throw new NetworkError('API returned invalid client data');
                }
                
                return clients;
              },
              // API circuit breaker fallback: Return empty array
              async () => {
                ErrorHandler.logError(
                  new DataSyncError('All data sources failed, returning empty array', 0), 
                  'getAllClients - final fallback'
                );
                return [];
              }
            );
          },
          'getAllClients'
        );
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        shouldRetry: (error, attemptCount) => {
          return ErrorHandler.shouldRetry(error, attemptCount, 3) && 
                 !(error instanceof CacheError); // Don't retry cache errors
        },
        onRetry: (error, attemptNumber, delay) => {
          ErrorHandler.logError(error, `getAllClients - retry attempt ${attemptNumber}`, {
            attemptNumber,
            delay,
            supabaseCircuitState: this.supabaseCircuitBreaker.getState(),
            apiCircuitState: this.apiCircuitBreaker.getState()
          });
        }
      }
    );
  }

  /**
   * Get client by ID from Supabase export data with automatic connection and offline support
   */
  async getClientById(clientId) {
    try {
      if (!clientId) {
        throw new Error('Client ID is required');
      }

      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initializeService();
      }

      // Try to get fresh data from Supabase using current mode and selection
      const result = await supabaseService.getCurrentData();
      
      if (!result.clients) {
        throw new Error('No client data found in export');
      }

      const clients = result.clients;
      const client = clients.find(c => c.id === clientId || c.id === parseInt(clientId));
      
      if (!client) {
        throw new Error('Client not found');
      }

      // Cache the data for offline use - but don't fail if caching fails
      try {
        await this.safeCacheData(result);
      } catch (cacheError) {
        // This should not happen since safeCacheData is supposed to be safe
        // but we'll handle it just in case
        ErrorHandler.logError(cacheError, 'getClientById - unexpected cache error');
      }

      return client;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to fetch client from Supabase');
      
      // Try to get cached data using DataService
      try {
        const cachedData = await dataService.getCachedData();
        if (cachedData && cachedData.clients) {
          const client = cachedData.clients.find(c => c.id === clientId || c.id === parseInt(clientId));
          if (client) {
            return client;
          }
        }
        
        // Also try Supabase cache as fallback
        const cachedResult = await supabaseService.getCachedData();
        if (cachedResult && cachedResult.data) {
          const data = cachedResult.data.data || cachedResult.data;
          if (data.clients) {
            const client = data.clients.find(c => c.id === clientId || c.id === parseInt(clientId));
            if (client) {
              return client;
            }
          }
        }
      } catch (cacheError) {
        ErrorHandler.logError(cacheError, 'Failed to get cached client data');
      }

      // Fallback to API if both Supabase and cache fail
      try {
        const response = await apiService.get(`/clients/${clientId}`);
        return response.data || response;
      } catch (apiError) {
        throw new Error(`Failed to fetch client details: ${error.message}`);
      }
    }
  }

  async searchClients(searchParams) {
    try {
      const response = await apiService.get('/clients/search', searchParams);
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to search clients: ${error.message}`);
    }
  }

  async getClientCessions(clientId) {
    try {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const response = await apiService.get(`/clients/${clientId}/cessions`);
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to fetch client cessions: ${error.message}`);
    }
  }

  async createClient(clientData) {
    try {
      const response = await apiService.post('/clients', clientData);
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }
  }

  async updateClient(clientId, clientData) {
    try {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const response = await apiService.put(`/clients/${clientId}`, clientData);
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }
  }

  async deleteClient(clientId) {
    try {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const response = await apiService.delete(`/clients/${clientId}`);
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to delete client: ${error.message}`);
    }
  }

  // Utility methods for client data processing
  formatClientForDisplay(client) {
    return {
      ...client,
      displayName: client.fullName || 'Unknown Client',
      formattedClientNumber: client.clientNumber ? `#${client.clientNumber}` : 'N/A',
      workplaceName: client.workplace?.name || 'N/A',
      cessionCount: client.cessions?.length || 0,
    };
  }

  filterClients(clients, filters) {
    if (!clients || !Array.isArray(clients)) {
      return [];
    }

    return clients.filter(client => {
      // Name filter
      if (filters.name && !client.fullName?.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }

      // CIN filter
      if (filters.cin && !client.cin?.toLowerCase().includes(filters.cin.toLowerCase())) {
        return false;
      }

      // Worker number filter
      if (filters.workerNumber && !client.workerNumber?.toLowerCase().includes(filters.workerNumber.toLowerCase())) {
        return false;
      }

      // Client number filter
      if (filters.clientNumber && !client.clientNumber?.toString().includes(filters.clientNumber)) {
        return false;
      }

      // Workplace filter
      if (filters.workplaceId && client.workplaceId !== filters.workplaceId) {
        return false;
      }

      return true;
    });
  }

  sortClients(clients, sortBy = 'fullName', sortOrder = 'asc') {
    if (!clients || !Array.isArray(clients)) {
      return [];
    }

    return [...clients].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Convert to string for comparison
      aValue = aValue.toString().toLowerCase();
      bValue = bValue.toString().toLowerCase();

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }
}

export const clientService = new ClientService();
export default clientService;
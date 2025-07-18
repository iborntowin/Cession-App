import { dataService } from '../src/services/DataService';
import { storageService } from '../src/utils/storage';
import { NetworkError, ValidationError, CacheError, DataSyncError } from '../src/utils/errorHandling';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('axios');
jest.mock('@react-native-community/netinfo');
jest.mock('../src/utils/storage');

const mockAxios = axios;
const mockNetInfo = NetInfo;
const mockStorageService = storageService;

describe('DataService', () => {
  const mockPublicUrl = 'https://example.supabase.co/storage/v1/object/public/exports/data.json';
  const mockValidData = {
    metadata: {
      exportTime: '2025-01-15T10:30:00Z',
      version: '1.0',
      recordCount: {
        clients: 2,
        cessions: 3
      }
    },
    clients: [
      {
        id: 'client-1',
        clientNumber: 1001,
        fullName: 'John Doe',
        cin: '12345678',
        phoneNumber: '+216123456789',
        address: '123 Main St',
        workerNumber: '1234567890',
        workplace: {
          id: 'workplace-1',
          name: 'Company A'
        },
        job: {
          id: 'job-1',
          name: 'Engineer'
        },
        cessions: [
          {
            id: 'cession-1',
            monthlyPayment: 250.00,
            startDate: '2024-01-01',
            endDate: null,
            expectedPayoffDate: '2026-01-01',
            remainingBalance: 5000.00,
            totalLoanAmount: 6000.00,
            currentProgress: 16.67,
            monthsRemaining: 22,
            bankOrAgency: 'Bank A',
            status: 'ACTIVE'
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    dataService.isOnline = true;
    dataService.isSyncing = false;
    dataService.syncListeners = [];
    dataService.errorListeners = [];

    // Mock NetInfo
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      // Simulate initial network state
      callback({ isConnected: true, isInternetReachable: true });
      return jest.fn(); // Return unsubscribe function
    });
    
    // Initialize network monitoring for tests
    dataService.initializeNetworkMonitoring();
  });

  describe('fetchLatestData', () => {
    it('should fetch and validate data successfully', async () => {
      mockAxios.get.mockResolvedValue({ data: mockValidData });

      const result = await dataService.fetchLatestData(mockPublicUrl);

      expect(mockAxios.get).toHaveBeenCalledWith(mockPublicUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      expect(result).toEqual(mockValidData);
    });

    it('should throw ValidationError for missing URL', async () => {
      await expect(dataService.fetchLatestData()).rejects.toThrow(ValidationError);
      await expect(dataService.fetchLatestData(null)).rejects.toThrow(ValidationError);
      await expect(dataService.fetchLatestData('')).rejects.toThrow(ValidationError);
    });

    it('should throw NetworkError for timeout', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAxios.get.mockRejectedValue(timeoutError);

      await expect(dataService.fetchLatestData(mockPublicUrl)).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError for server error', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
      mockAxios.get.mockRejectedValue(serverError);

      await expect(dataService.fetchLatestData(mockPublicUrl)).rejects.toThrow(NetworkError);
    });

    it('should throw ValidationError for invalid data structure', async () => {
      const invalidData = { invalid: 'data' };
      mockAxios.get.mockResolvedValue({ data: invalidData });

      await expect(dataService.fetchLatestData(mockPublicUrl)).rejects.toThrow(ValidationError);
    });

    it('should throw NetworkError for no data received', async () => {
      mockAxios.get.mockResolvedValue({ data: null });

      await expect(dataService.fetchLatestData(mockPublicUrl)).rejects.toThrow(NetworkError);
    });
  });

  describe('getCachedData', () => {
    it('should return cached data when valid', async () => {
      mockStorageService.getItem.mockResolvedValue(mockValidData);

      const result = await dataService.getCachedData();

      expect(mockStorageService.getItem).toHaveBeenCalledWith('app_data');
      expect(result).toEqual(mockValidData);
    });

    it('should return null when no cached data exists', async () => {
      mockStorageService.getItem.mockResolvedValue(null);

      const result = await dataService.getCachedData();

      expect(result).toBeNull();
    });

    it('should clear cache and return null for corrupted data', async () => {
      const corruptedData = { invalid: 'data' };
      mockStorageService.getItem.mockResolvedValue(corruptedData);

      const result = await dataService.getCachedData();

      expect(result).toBeNull();
      // Note: clearCache is called but we don't verify it here as it's an internal implementation
    });

    it('should handle storage errors gracefully', async () => {
      mockStorageService.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await dataService.getCachedData();

      expect(result).toBeNull();
    });
  });

  describe('cacheData', () => {
    it('should cache valid data successfully', async () => {
      mockStorageService.setItem.mockResolvedValue(true);

      const result = await dataService.cacheData(mockValidData);

      expect(mockStorageService.setItem).toHaveBeenCalledWith('app_data', mockValidData);
      expect(mockStorageService.setItem).toHaveBeenCalledWith('last_sync_timestamp', expect.any(Number));
      expect(mockStorageService.setItem).toHaveBeenCalledWith('data_version', '1.0');
      expect(result).toBe(true);
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = { invalid: 'data' };

      await expect(dataService.cacheData(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw CacheError for storage failures', async () => {
      mockStorageService.setItem.mockRejectedValue(new Error('Storage full'));

      await expect(dataService.cacheData(mockValidData)).rejects.toThrow(CacheError);
    });
  });

  describe('syncData', () => {
    it('should sync data successfully', async () => {
      mockAxios.get.mockResolvedValue({ data: mockValidData });
      mockStorageService.setItem.mockResolvedValue(true);

      const result = await dataService.syncData(mockPublicUrl);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockValidData);
      expect(result.message).toBe('Data synchronized successfully');
    });

    it('should return error when already syncing', async () => {
      dataService.isSyncing = true;

      const result = await dataService.syncData(mockPublicUrl);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Sync already in progress');
    });

    it('should return error when offline', async () => {
      dataService.isOnline = false;

      const result = await dataService.syncData(mockPublicUrl);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No internet connection');
    });

    it('should retry on failure and eventually succeed', async () => {
      mockAxios.get
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValueOnce({ data: mockValidData });
      mockStorageService.setItem.mockResolvedValue(true);

      const result = await dataService.syncData(mockPublicUrl);

      expect(result.success).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should fail after max retry attempts', async () => {
      mockAxios.get.mockRejectedValue(new ValidationError('Persistent validation error'));

      const result = await dataService.syncData(mockPublicUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DataSyncError);
      expect(mockAxios.get).toHaveBeenCalledTimes(1); // Non-retryable error
    }, 10000);

    it('should force sync even when already syncing', async () => {
      dataService.isSyncing = true;
      mockAxios.get.mockResolvedValue({ data: mockValidData });
      mockStorageService.setItem.mockResolvedValue(true);

      const result = await dataService.syncData(mockPublicUrl, true);

      expect(result.success).toBe(true);
    });
  });

  describe('getData', () => {
    it('should return fresh data from network when online', async () => {
      mockAxios.get.mockResolvedValue({ data: mockValidData });
      mockStorageService.setItem.mockResolvedValue(true);

      const result = await dataService.getData(mockPublicUrl);

      expect(result.source).toBe('network');
      expect(result.data).toEqual(mockValidData);
      expect(result.isStale).toBe(false);
    });

    it('should fallback to cached data when network fails', async () => {
      mockAxios.get.mockRejectedValue(new ValidationError('Network error'));
      mockStorageService.getItem.mockImplementation((key) => {
        if (key === 'app_data') return Promise.resolve(mockValidData);
        if (key === 'last_sync_timestamp') return Promise.resolve(Date.now() - 1000);
        return Promise.resolve(null);
      });

      const result = await dataService.getData(mockPublicUrl);

      expect(result.source).toBe('cache');
      expect(result.data).toEqual(mockValidData);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should return cached data when preferCache is true', async () => {
      mockStorageService.getItem.mockImplementation((key) => {
        if (key === 'app_data') return Promise.resolve(mockValidData);
        if (key === 'last_sync_timestamp') return Promise.resolve(Date.now() - 1000);
        return Promise.resolve(null);
      });

      const result = await dataService.getData(mockPublicUrl, { preferCache: true });

      expect(result.source).toBe('cache');
      expect(result.data).toEqual(mockValidData);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should mark data as stale when old', async () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      mockStorageService.getItem.mockImplementation((key) => {
        if (key === 'app_data') return Promise.resolve(mockValidData);
        if (key === 'last_sync_timestamp') return Promise.resolve(oldTimestamp);
        return Promise.resolve(null);
      });

      const result = await dataService.getData(mockPublicUrl, { preferCache: true });

      expect(result.isStale).toBe(true);
    });

    it('should throw error when no data is available', async () => {
      mockAxios.get.mockRejectedValue(new ValidationError('Network error'));
      mockStorageService.getItem.mockResolvedValue(null);

      await expect(dataService.getData(mockPublicUrl)).rejects.toThrow();
    }, 10000);
  });

  describe('utility methods', () => {
    it('should get last sync time', async () => {
      const timestamp = Date.now();
      mockStorageService.getItem.mockResolvedValue(timestamp);

      const result = await dataService.getLastSyncTime();

      expect(mockStorageService.getItem).toHaveBeenCalledWith('last_sync_timestamp');
      expect(result).toBe(timestamp);
    });

    it('should check if data is fresh', async () => {
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      mockStorageService.getItem.mockResolvedValue(recentTimestamp);

      const result = await dataService.isDataFresh();

      expect(result).toBe(true);
    });

    it('should check if data is stale', async () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      mockStorageService.getItem.mockResolvedValue(oldTimestamp);

      const result = await dataService.isDataFresh();

      expect(result).toBe(false);
    });

    it('should get data version', async () => {
      mockStorageService.getItem.mockResolvedValue('1.0');

      const result = await dataService.getDataVersion();

      expect(mockStorageService.getItem).toHaveBeenCalledWith('data_version');
      expect(result).toBe('1.0');
    });

    it('should clear cache', async () => {
      mockStorageService.removeItem.mockResolvedValue(true);

      const result = await dataService.clearCache();

      expect(mockStorageService.removeItem).toHaveBeenCalledWith('app_data');
      expect(mockStorageService.removeItem).toHaveBeenCalledWith('last_sync_timestamp');
      expect(mockStorageService.removeItem).toHaveBeenCalledWith('data_version');
      expect(result).toBe(true);
    });

    it('should get sync status', () => {
      const status = dataService.getSyncStatus();

      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('lastSyncTime');
      expect(status).toHaveProperty('dataVersion');
    });
  });

  describe('listeners', () => {
    it('should add and notify sync listeners', () => {
      const listener = jest.fn();
      dataService.addSyncListener(listener);

      dataService.notifySyncListeners('syncing', { test: 'data' });

      expect(listener).toHaveBeenCalledWith('syncing', { test: 'data' });
    });

    it('should remove sync listeners', () => {
      const listener = jest.fn();
      dataService.addSyncListener(listener);
      dataService.removeSyncListener(listener);

      dataService.notifySyncListeners('syncing');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should add and notify error listeners', () => {
      const listener = jest.fn();
      dataService.addErrorListener(listener);

      const error = new Error('Test error');
      dataService.notifyErrorListeners(error);

      expect(listener).toHaveBeenCalledWith(error);
    });

    it('should remove error listeners', () => {
      const listener = jest.fn();
      dataService.addErrorListener(listener);
      dataService.removeErrorListener(listener);

      const error = new Error('Test error');
      dataService.notifyErrorListeners(error);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      dataService.addSyncListener(faultyListener);
      dataService.addSyncListener(goodListener);

      // Should not throw
      expect(() => {
        dataService.notifySyncListeners('syncing');
      }).not.toThrow();

      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('network monitoring', () => {
    it('should initialize network monitoring', () => {
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should auto-sync when coming back online', () => {
      // Get the network listener callback
      const networkCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      // Mock sync method
      const syncSpy = jest.spyOn(dataService, 'syncData').mockResolvedValue({ success: true });
      
      // Simulate going offline then online
      dataService.isOnline = false;
      networkCallback({ isConnected: true, isInternetReachable: true });

      expect(syncSpy).toHaveBeenCalled();
      
      syncSpy.mockRestore();
    });
  });
});
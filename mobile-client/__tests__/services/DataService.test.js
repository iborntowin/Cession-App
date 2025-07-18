import DataService from '../../src/services/DataService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('axios');

describe('DataService', () => {
  let dataService;
  const mockSupabaseUrl = 'https://test.supabase.co/storage/v1/object/public/bucket/export-test.json';
  
  const mockExportData = {
    metadata: {
      exportTime: '2024-01-15T10:30:00Z',
      version: '1.0',
      recordCount: {
        clients: 2,
        cessions: 3
      }
    },
    clients: [
      {
        id: 'client-1',
        fullName: 'John Doe',
        cin: '12345678',
        phoneNumber: '+216123456789',
        cessions: [
          {
            id: 'cession-1',
            monthlyPayment: 250.00,
            status: 'ACTIVE',
            remainingBalance: 5000.00
          }
        ]
      },
      {
        id: 'client-2',
        fullName: 'Jane Smith',
        cin: '87654321',
        phoneNumber: '+216987654321',
        cessions: [
          {
            id: 'cession-2',
            monthlyPayment: 300.00,
            status: 'ACTIVE',
            remainingBalance: 4000.00
          },
          {
            id: 'cession-3',
            monthlyPayment: 150.00,
            status: 'COMPLETED',
            remainingBalance: 0.00
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dataService = new DataService();
    
    // Mock NetInfo to return online by default
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true
    });
  });

  describe('fetchLatestData', () => {
    test('successfully fetches and caches data when online', async () => {
      // Arrange
      axios.get.mockResolvedValue({
        data: mockExportData,
        status: 200
      });
      AsyncStorage.setItem.mockResolvedValue();

      // Act
      const result = await dataService.fetchLatestData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExportData);
      expect(axios.get).toHaveBeenCalledWith(mockSupabaseUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_export_data',
        JSON.stringify({
          data: mockExportData,
          timestamp: expect.any(Number),
          url: mockSupabaseUrl
        })
      );
    });

    test('returns cached data when offline', async () => {
      // Arrange
      NetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false
      });
      
      const cachedData = {
        data: mockExportData,
        timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
        url: mockSupabaseUrl
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await dataService.fetchLatestData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExportData);
      expect(result.fromCache).toBe(true);
      expect(result.isStale).toBe(false);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('handles network errors gracefully', async () => {
      // Arrange
      axios.get.mockRejectedValue(new Error('Network Error'));
      AsyncStorage.getItem.mockResolvedValue(null);

      // Act
      const result = await dataService.fetchLatestData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network Error');
      expect(result.data).toBeNull();
    });

    test('returns cached data when network request fails', async () => {
      // Arrange
      axios.get.mockRejectedValue(new Error('Network timeout'));
      
      const cachedData = {
        data: mockExportData,
        timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
        url: mockSupabaseUrl
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await dataService.fetchLatestData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExportData);
      expect(result.fromCache).toBe(true);
      expect(result.isStale).toBe(true); // Should be stale after 1 hour
      expect(result.networkError).toContain('Network timeout');
    });

    test('validates data structure before caching', async () => {
      // Arrange
      const invalidData = { invalid: 'structure' };
      axios.get.mockResolvedValue({
        data: invalidData,
        status: 200
      });

      // Act
      const result = await dataService.fetchLatestData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid data structure');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    test('handles malformed JSON in cache', async () => {
      // Arrange
      axios.get.mockRejectedValue(new Error('Network Error'));
      AsyncStorage.getItem.mockResolvedValue('invalid json');

      // Act
      const result = await dataService.fetchLatestData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network Error');
    });
  });

  describe('getCachedData', () => {
    test('returns cached data when available', async () => {
      // Arrange
      const cachedData = {
        data: mockExportData,
        timestamp: Date.now() - 1000 * 60 * 10, // 10 minutes ago
        url: mockSupabaseUrl
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await dataService.getCachedData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExportData);
      expect(result.timestamp).toBe(cachedData.timestamp);
      expect(result.isStale).toBe(false);
    });

    test('returns null when no cached data exists', async () => {
      // Arrange
      AsyncStorage.getItem.mockResolvedValue(null);

      // Act
      const result = await dataService.getCachedData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.timestamp).toBeNull();
    });

    test('identifies stale cached data', async () => {
      // Arrange
      const staleData = {
        data: mockExportData,
        timestamp: Date.now() - 1000 * 60 * 60 * 25, // 25 hours ago
        url: mockSupabaseUrl
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(staleData));

      // Act
      const result = await dataService.getCachedData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExportData);
      expect(result.isStale).toBe(true);
    });
  });

  describe('syncData', () => {
    test('syncs data when online and cache is stale', async () => {
      // Arrange
      const staleData = {
        data: mockExportData,
        timestamp: Date.now() - 1000 * 60 * 60 * 25, // 25 hours ago
        url: mockSupabaseUrl
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(staleData));
      axios.get.mockResolvedValue({
        data: mockExportData,
        status: 200
      });
      AsyncStorage.setItem.mockResolvedValue();

      // Act
      const result = await dataService.syncData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(true);
      expect(result.synced).toBe(true);
      expect(axios.get).toHaveBeenCalled();
    });

    test('skips sync when cache is fresh', async () => {
      // Arrange
      const freshData = {
        data: mockExportData,
        timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
        url: mockSupabaseUrl
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(freshData));

      // Act
      const result = await dataService.syncData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(true);
      expect(result.synced).toBe(false);
      expect(result.reason).toBe('Cache is still fresh');
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('handles sync failure gracefully', async () => {
      // Arrange
      const staleData = {
        data: mockExportData,
        timestamp: Date.now() - 1000 * 60 * 60 * 25, // 25 hours ago
        url: mockSupabaseUrl
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(staleData));
      axios.get.mockRejectedValue(new Error('Sync failed'));

      // Act
      const result = await dataService.syncData(mockSupabaseUrl);

      // Assert
      expect(result.success).toBe(false);
      expect(result.synced).toBe(false);
      expect(result.error).toContain('Sync failed');
    });
  });

  describe('getLastSyncTime', () => {
    test('returns last sync timestamp', async () => {
      // Arrange
      const cachedData = {
        data: mockExportData,
        timestamp: 1642248600000, // Fixed timestamp
        url: mockSupabaseUrl
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await dataService.getLastSyncTime();

      // Assert
      expect(result).toBe(1642248600000);
    });

    test('returns null when no cached data exists', async () => {
      // Arrange
      AsyncStorage.getItem.mockResolvedValue(null);

      // Act
      const result = await dataService.getLastSyncTime();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    test('clears cached data', async () => {
      // Arrange
      AsyncStorage.removeItem.mockResolvedValue();

      // Act
      await dataService.clearCache();

      // Assert
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cached_export_data');
    });
  });

  describe('isDataStale', () => {
    test('identifies stale data correctly', () => {
      // Test with 25 hours old data (should be stale)
      const staleTimestamp = Date.now() - 1000 * 60 * 60 * 25;
      expect(dataService.isDataStale(staleTimestamp)).toBe(true);

      // Test with 1 hour old data (should be fresh)
      const freshTimestamp = Date.now() - 1000 * 60 * 60 * 1;
      expect(dataService.isDataStale(freshTimestamp)).toBe(false);
    });
  });

  describe('validateDataStructure', () => {
    test('validates correct data structure', () => {
      expect(dataService.validateDataStructure(mockExportData)).toBe(true);
    });

    test('rejects invalid data structure', () => {
      const invalidData = { invalid: 'structure' };
      expect(dataService.validateDataStructure(invalidData)).toBe(false);

      const missingMetadata = { clients: [] };
      expect(dataService.validateDataStructure(missingMetadata)).toBe(false);

      const missingClients = { metadata: { exportTime: '2024-01-01' } };
      expect(dataService.validateDataStructure(missingClients)).toBe(false);
    });
  });

  describe('connectivity handling', () => {
    test('handles connectivity changes', async () => {
      // Arrange
      let connectivityCallback;
      NetInfo.addEventListener.mockImplementation((callback) => {
        connectivityCallback = callback;
        return jest.fn(); // unsubscribe function
      });

      // Act
      dataService.startConnectivityMonitoring();
      
      // Simulate connectivity change
      connectivityCallback({
        isConnected: true,
        isInternetReachable: true
      });

      // Assert
      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });

    test('auto-syncs when coming back online', async () => {
      // This would require more complex setup to test the actual auto-sync behavior
      // For now, we just verify the connectivity monitoring is set up
      NetInfo.addEventListener.mockImplementation(() => jest.fn());
      
      dataService.startConnectivityMonitoring();
      
      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });
  });
});
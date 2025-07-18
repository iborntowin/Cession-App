import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  // Generic storage methods
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error storing item with key ${key}:`, error);
      throw new Error(`Failed to store data: ${error.message}`);
    }
  }

  async getItem(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error retrieving item with key ${key}:`, error);
      return null;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item with key ${key}:`, error);
      throw new Error(`Failed to remove data: ${error.message}`);
    }
  }

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw new Error(`Failed to clear storage: ${error.message}`);
    }
  }

  async getAllKeys() {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  // App-specific storage methods
  async setAuthToken(token) {
    await this.setItem('auth_token', token);
  }

  async getAuthToken() {
    return await this.getItem('auth_token');
  }

  async removeAuthToken() {
    await this.removeItem('auth_token');
  }

  async setUserData(userData) {
    await this.setItem('user_data', userData);
  }

  async getUserData() {
    return await this.getItem('user_data');
  }

  async removeUserData() {
    await this.removeItem('user_data');
  }

  // App settings
  async setAppSettings(settings) {
    await this.setItem('app_settings', settings);
  }

  async getAppSettings() {
    const defaultSettings = {
      theme: 'light',
      language: 'en',
      notifications: true,
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds
    };
    
    const savedSettings = await this.getItem('app_settings');
    return { ...defaultSettings, ...savedSettings };
  }

  async updateAppSetting(key, value) {
    const currentSettings = await this.getAppSettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    await this.setAppSettings(updatedSettings);
  }

  // Cache management
  async setCachedData(key, data, expirationMinutes = 60) {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expirationMinutes,
    };
    await this.setItem(`cache_${key}`, cacheItem);
  }

  async getCachedData(key) {
    const cacheItem = await this.getItem(`cache_${key}`);
    
    if (!cacheItem) {
      return null;
    }

    const { data, timestamp, expirationMinutes } = cacheItem;
    const now = Date.now();
    const expirationTime = timestamp + (expirationMinutes * 60 * 1000);

    if (now > expirationTime) {
      // Cache expired, remove it
      await this.removeItem(`cache_${key}`);
      return null;
    }

    return data;
  }

  async clearCache() {
    try {
      const keys = await this.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        await this.removeItem(key);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Search history
  async addSearchHistory(query) {
    if (!query || query.trim() === '') return;
    
    const history = await this.getSearchHistory();
    const updatedHistory = [query, ...history.filter(item => item !== query)].slice(0, 10); // Keep last 10 searches
    await this.setItem('search_history', updatedHistory);
  }

  async getSearchHistory() {
    return (await this.getItem('search_history')) || [];
  }

  async clearSearchHistory() {
    await this.removeItem('search_history');
  }

  // Recently viewed clients
  async addRecentlyViewedClient(client) {
    if (!client || !client.id) return;
    
    const recentClients = await this.getRecentlyViewedClients();
    const updatedClients = [
      client,
      ...recentClients.filter(item => item.id !== client.id)
    ].slice(0, 5); // Keep last 5 viewed clients
    
    await this.setItem('recently_viewed_clients', updatedClients);
  }

  async getRecentlyViewedClients() {
    return (await this.getItem('recently_viewed_clients')) || [];
  }

  async clearRecentlyViewedClients() {
    await this.removeItem('recently_viewed_clients');
  }

  // Offline data management
  async setOfflineData(key, data) {
    await this.setItem(`offline_${key}`, {
      data,
      timestamp: Date.now(),
    });
  }

  async getOfflineData(key) {
    const offlineItem = await this.getItem(`offline_${key}`);
    return offlineItem?.data || null;
  }

  async clearOfflineData() {
    try {
      const keys = await this.getAllKeys();
      const offlineKeys = keys.filter(key => key.startsWith('offline_'));
      
      for (const key of offlineKeys) {
        await this.removeItem(key);
      }
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }
}

export const storageService = new StorageService();
export default storageService;
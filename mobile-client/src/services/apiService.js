import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:8082/api/v1' // Android emulator localhost (backend runs on 8082)
  : 'https://your-production-api.com/api/v1';

const TIMEOUT = 30000; // 30 seconds (increased from 10)

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth headers
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('auth_token');
          // You might want to navigate to login screen here
        }
        
        // For timeouts and network errors, don't throw - let calling code handle gracefully
        if (error.code === 'ECONNABORTED' || !error.response) {
          return Promise.reject(error); // Still reject but don't log via handleError
        }
        
        return Promise.reject(this.handleError(error));
      }
    );
  }

  async checkNetworkConnection() {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No internet connection');
    }
    return netInfo;
  }

  handleError(error) {
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout. Please check your connection.');
    }
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message = data?.message || data?.error || `HTTP ${status} Error`;
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  async get(endpoint, params = {}) {
    await this.checkNetworkConnection();
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post(endpoint, data = {}) {
    await this.checkNetworkConnection();
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put(endpoint, data = {}) {
    await this.checkNetworkConnection();
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async delete(endpoint) {
    await this.checkNetworkConnection();
    const response = await this.client.delete(endpoint);
    return response.data;
  }

  // Auth methods
  async setAuthToken(token) {
    await AsyncStorage.setItem('auth_token', token);
  }

  async getAuthToken() {
    return await AsyncStorage.getItem('auth_token');
  }

  async clearAuthToken() {
    await AsyncStorage.removeItem('auth_token');
  }

  // Update base URL (useful for switching environments)
  updateBaseURL(newBaseURL) {
    this.client.defaults.baseURL = newBaseURL;
  }
}

export const apiService = new ApiService();
export default apiService;
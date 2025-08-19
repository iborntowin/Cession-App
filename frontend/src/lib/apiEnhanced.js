/**
 * Enhanced API utility with caching, debouncing, and performance optimizations
 * Addresses issues identified in test reports:
 * - Multiple redundant API calls
 * - No caching for static/semi-static data
 * - Poor error recovery
 * - Memory leaks from pending requests
 * - Missing request optimization
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { clearAuth, showAlert, token } from './stores';
import { get } from 'svelte/store';
import { config } from './config';

// Configuration
const BACKEND_URL = config.backendUrl;
const API_PREFIX = config.apiPrefix;

// Cache configuration
const CACHE_CONFIG = {
  // Default TTL for different data types (in milliseconds)
  CLIENT_LIST: 5 * 60 * 1000,      // 5 minutes
  PRODUCT_LIST: 10 * 60 * 1000,    // 10 minutes
  SETTINGS: 15 * 60 * 1000,        // 15 minutes
  USER_PROFILE: 30 * 60 * 1000,    // 30 minutes
  STATISTICS: 2 * 60 * 1000,       // 2 minutes
  SEARCH_RESULTS: 1 * 60 * 1000,   // 1 minute
  DEFAULT: 5 * 60 * 1000           // 5 minutes default
};

// Request debouncing configuration
const DEBOUNCE_CONFIG = {
  SEARCH: 300,           // 300ms for search requests
  AUTOCOMPLETE: 150,     // 150ms for autocomplete
  VALIDATION: 500,       // 500ms for validation requests
  DEFAULT: 200           // 200ms default
};

// Request timeout configuration
const TIMEOUT_CONFIG = {
  FAST: 5000,            // 5 seconds for quick operations
  NORMAL: 10000,         // 10 seconds for normal operations
  SLOW: 30000,           // 30 seconds for slow operations like file uploads
  DEFAULT: 10000         // 10 seconds default
};

/**
 * Enhanced Cache Manager with TTL and memory management
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.requestQueue = new Map(); // For deduplicating concurrent requests
    this.maxCacheSize = 1000; // Maximum number of cache entries
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key from URL and parameters
   */
  generateKey(url, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${url}${paramString ? `?${paramString}` : ''}`;
  }

  /**
   * Set cache entry with TTL
   */
  set(key, value, ttl = CACHE_CONFIG.DEFAULT) {
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl
    });
    
    this.ttlMap.set(key, Date.now() + ttl);
  }

  /**
   * Get cache entry if not expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
    this.requestQueue.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, expireTime] of this.ttlMap.entries()) {
      if (now > expireTime) {
        this.delete(key);
      }
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  evictOldest() {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10% of entries
    const toRemove = Math.floor(entries.length * 0.1) || 1;
    for (let i = 0; i < toRemove; i++) {
      this.delete(entries[i][0]);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }

  /**
   * Destroy cache manager
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * Request Debouncer to prevent excessive API calls
 */
class RequestDebouncer {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Debounce a request function
   */
  debounce(key, fn, delay = DEBOUNCE_CONFIG.DEFAULT) {
    return new Promise((resolve, reject) => {
      // Clear existing timeout for this key
      if (this.pendingRequests.has(key)) {
        clearTimeout(this.pendingRequests.get(key).timeoutId);
      }

      // Set new timeout
      const timeoutId = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.pendingRequests.delete(key);
        }
      }, delay);

      this.pendingRequests.set(key, { timeoutId, resolve, reject });
    });
  }

  /**
   * Cancel all pending requests
   */
  cancelAll() {
    for (const [key, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('Request cancelled'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Cancel specific request
   */
  cancel(key) {
    const request = this.pendingRequests.get(key);
    if (request) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('Request cancelled'));
      this.pendingRequests.delete(key);
    }
  }
}

/**
 * Request Queue Manager for deduplicating concurrent requests
 */
class RequestQueueManager {
  constructor() {
    this.activeRequests = new Map();
  }

  /**
   * Execute request with deduplication
   */
  async execute(key, requestFn) {
    // If request is already in progress, return the existing promise
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key);
    }

    // Create new request promise
    const requestPromise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.activeRequests.delete(key);
      });

    this.activeRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Cancel all active requests
   */
  cancelAll() {
    this.activeRequests.clear();
  }
}

// Global instances
const cacheManager = new CacheManager();
const debouncer = new RequestDebouncer();
const requestQueue = new RequestQueueManager();

// Track authentication state
let isHandlingAuthError = false;
let redirectTimeout = null;

/**
 * Enhanced request wrapper with timeout, retry, and cancellation
 */
async function makeEnhancedRequest(url, options = {}, timeout = TIMEOUT_CONFIG.DEFAULT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Enhanced response handler with better error management
 */
async function handleEnhancedResponse(response) {
  const contentType = response.headers.get('content-type');
  let responseData;

  try {
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
  } catch (parseError) {
    console.error('Failed to parse response:', parseError);
    responseData = `Server returned an invalid response (Status: ${response.status})`;
  }

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    if (browser && !isHandlingAuthError) {
      isHandlingAuthError = true;
      if (redirectTimeout) clearTimeout(redirectTimeout);
      
      console.warn('Authentication error detected, redirecting to login');
      showAlert('Your session has expired. Please log in again.', 'error');
      clearAuth();
      goto('/login');

      redirectTimeout = setTimeout(() => {
        isHandlingAuthError = false;
      }, 2000);
    }
    throw new Error(responseData?.message || `Authentication failed with status ${response.status}`);
  }

  // Handle other errors
  if (!response.ok) {
    let errorMessage;
    
    if (typeof responseData === 'object' && responseData.message) {
      errorMessage = responseData.message;
    } else if (typeof responseData === 'string') {
      if (responseData.includes('<!DOCTYPE') || responseData.includes('<html>')) {
        errorMessage = `Server error (${response.status}): Backend service unavailable`;
      } else {
        errorMessage = responseData;
      }
    } else {
      errorMessage = `API request failed with status ${response.status}`;
    }
    
    // Don't show alert for validation errors (400/422) - let component handle
    if (response.status !== 400 && response.status !== 422) {
      showAlert(errorMessage, 'error');
    }
    
    throw new Error(errorMessage);
  }

  return responseData;
}

/**
 * Get authentication headers
 */
function getAuthHeaders() {
  const currentToken = get(token);
  
  if (!currentToken) {
    throw new Error('No authentication token found');
  }

  return {
    'Authorization': `Bearer ${currentToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Enhanced API call with caching, debouncing, and optimization
 */
async function enhancedApiCall({
  url,
  method = 'GET',
  data = null,
  cache = false,
  cacheTTL = CACHE_CONFIG.DEFAULT,
  debounceKey = null,
  debounceDelay = DEBOUNCE_CONFIG.DEFAULT,
  timeout = TIMEOUT_CONFIG.DEFAULT,
  skipAuth = false
}) {
  // Generate cache key
  const cacheKey = cache ? cacheManager.generateKey(url, { method, data }) : null;
  
  // Check cache for GET requests
  if (cache && method === 'GET' && cacheKey) {
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  // Prepare request function
  const makeRequest = async () => {
    const options = {
      method,
      headers: skipAuth ? { 'Content-Type': 'application/json' } : getAuthHeaders()
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    // Use request queue to deduplicate concurrent requests
    const requestKey = `${method}:${url}:${JSON.stringify(data)}`;
    
    return requestQueue.execute(requestKey, async () => {
      const response = await makeEnhancedRequest(`${BACKEND_URL}${url}`, options, timeout);
      const result = await handleEnhancedResponse(response);
      
      // Cache successful GET responses
      if (cache && method === 'GET' && cacheKey) {
        cacheManager.set(cacheKey, result, cacheTTL);
      }
      
      return result;
    });
  };

  // Apply debouncing if specified
  if (debounceKey) {
    return debouncer.debounce(debounceKey, makeRequest, debounceDelay);
  }

  return makeRequest();
}

/**
 * Enhanced clients API with caching and optimization
 */
export const enhancedClientsApi = {
  /**
   * Get all clients with caching
   */
  getAll: async () => {
    return enhancedApiCall({
      url: '/api/v1/clients',
      cache: true,
      cacheTTL: CACHE_CONFIG.CLIENT_LIST
    });
  },

  /**
   * Search clients with debouncing
   */
  search: async (searchParams) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const searchKey = params.toString();
    
    return enhancedApiCall({
      url: `/api/v1/clients/search?${params.toString()}`,
      cache: true,
      cacheTTL: CACHE_CONFIG.SEARCH_RESULTS,
      debounceKey: `client-search-${searchKey}`,
      debounceDelay: DEBOUNCE_CONFIG.SEARCH
    });
  },

  /**
   * Get client by ID with caching
   */
  getById: async (id) => {
    if (!id || id === 'undefined') {
      throw new Error('Invalid client ID');
    }

    try {
      const data = await enhancedApiCall({
        url: `/api/v1/clients/${id}`,
        cache: true,
        cacheTTL: CACHE_CONFIG.CLIENT_LIST
      });
      return { success: true, data };
    } catch (error) {
      console.error('Enhanced Client API - getById error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create client (invalidates cache)
   */
  create: async (clientData) => {
    try {
      const result = await enhancedApiCall({
        url: '/api/v1/clients',
        method: 'POST',
        data: clientData,
        timeout: TIMEOUT_CONFIG.NORMAL
      });

      // Invalidate relevant caches
      cacheManager.delete(cacheManager.generateKey('/api/v1/clients'));
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Enhanced Client API - create error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update client (invalidates cache)
   */
  update: async (id, clientData) => {
    try {
      const result = await enhancedApiCall({
        url: `/api/v1/clients/${id}`,
        method: 'PUT',
        data: clientData,
        timeout: TIMEOUT_CONFIG.NORMAL
      });

      // Invalidate relevant caches
      cacheManager.delete(cacheManager.generateKey('/api/v1/clients'));
      cacheManager.delete(cacheManager.generateKey(`/api/v1/clients/${id}`));
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Enhanced Client API - update error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete client (invalidates cache)
   */
  delete: async (id) => {
    try {
      await enhancedApiCall({
        url: `/api/v1/clients/${id}`,
        method: 'DELETE',
        timeout: TIMEOUT_CONFIG.FAST
      });

      // Invalidate relevant caches
      cacheManager.delete(cacheManager.generateKey('/api/v1/clients'));
      cacheManager.delete(cacheManager.generateKey(`/api/v1/clients/${id}`));
      
      return { success: true };
    } catch (error) {
      console.error('Enhanced Client API - delete error:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Enhanced statistics API with caching
 */
export const enhancedStatsApi = {
  /**
   * Get payment statistics with short-term caching
   */
  getPaymentStats: async () => {
    return enhancedApiCall({
      url: '/api/v1/stats/payments',
      cache: true,
      cacheTTL: CACHE_CONFIG.STATISTICS
    });
  },

  /**
   * Get client statistics with short-term caching
   */
  getClientStats: async () => {
    return enhancedApiCall({
      url: '/api/v1/stats/clients',
      cache: true,
      cacheTTL: CACHE_CONFIG.STATISTICS
    });
  },

  /**
   * Get dashboard data with caching
   */
  getDashboardData: async () => {
    return enhancedApiCall({
      url: '/api/v1/stats/dashboard',
      cache: true,
      cacheTTL: CACHE_CONFIG.STATISTICS
    });
  }
};

/**
 * Cache management utilities
 */
export const cacheUtils = {
  /**
   * Clear all cache
   */
  clearAll: () => {
    cacheManager.clear();
  },

  /**
   * Clear specific cache by pattern
   */
  clearByPattern: (pattern) => {
    const keys = Array.from(cacheManager.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cacheManager.delete(key);
      }
    });
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    return cacheManager.getStats();
  },

  /**
   * Warm cache with common data
   */
  warmCache: async () => {
    try {
      // Pre-load commonly used data
      await Promise.allSettled([
        enhancedClientsApi.getAll(),
        enhancedStatsApi.getDashboardData()
      ]);
    } catch (error) {
      console.warn('Cache warming failed:', error);
    }
  }
};

/**
 * Request management utilities
 */
export const requestUtils = {
  /**
   * Cancel all pending debounced requests
   */
  cancelAllDebounced: () => {
    debouncer.cancelAll();
  },

  /**
   * Cancel all active requests
   */
  cancelAllActive: () => {
    requestQueue.cancelAll();
  },

  /**
   * Cancel specific debounced request
   */
  cancelDebounced: (key) => {
    debouncer.cancel(key);
  }
};

/**
 * Cleanup function to call on component destruction
 */
export const cleanup = () => {
  debouncer.cancelAll();
  requestQueue.cancelAll();
  if (redirectTimeout) {
    clearTimeout(redirectTimeout);
  }
};

/**
 * Initialize enhanced API system
 */
export const initializeEnhancedApi = () => {
  console.log('Enhanced API system initialized');
  
  // Warm cache on initialization
  if (browser) {
    cacheUtils.warmCache();
  }
};

/**
 * Destroy enhanced API system
 */
export const destroyEnhancedApi = () => {
  cleanup();
  cacheManager.destroy();
  console.log('Enhanced API system destroyed');
};

// Export the enhanced API call function for custom usage
export { enhancedApiCall };

// Export configuration for external access
export { CACHE_CONFIG, DEBOUNCE_CONFIG, TIMEOUT_CONFIG };

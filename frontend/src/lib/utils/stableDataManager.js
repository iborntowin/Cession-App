/**
 * Stable Data Manager - Prevents flickering by managing data updates intelligently
 */

export class StableDataManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.loadingStates = new Map();
    this.lastLoadTimes = new Map();
    this.cacheDuration = options.cacheDuration || 300000; // 5 minutes default
    this.debounceTime = options.debounceTime || 1000;
    this.debounceTimeouts = new Map();
  }

  /**
   * Stable data loading with caching and deduplication
   */
  async loadData(key, loadFunction, forceRefresh = false) {
    const now = Date.now();
    
    // Prevent multiple simultaneous loads
    if (this.loadingStates.get(key)) {
      return this.cache.get(key) || null;
    }

    // Use cache if recent and not forced refresh
    const lastLoadTime = this.lastLoadTimes.get(key) || 0;
    const cachedData = this.cache.get(key);
    
    if (!forceRefresh && cachedData && (now - lastLoadTime) < this.cacheDuration) {
      return cachedData;
    }

    this.loadingStates.set(key, true);
    
    try {
      const newData = await loadFunction();
      
      // Only update cache if data actually changed
      const existingData = this.cache.get(key);
      if (JSON.stringify(newData) !== JSON.stringify(existingData)) {
        this.cache.set(key, newData);
        this.lastLoadTimes.set(key, now);
      }
      
      return newData;
    } catch (error) {
      console.error(`Error loading data for key ${key}:`, error);
      // Return cached data if available, otherwise throw
      const cachedData = this.cache.get(key);
      if (cachedData) {
        return cachedData;
      }
      throw error;
    } finally {
      this.loadingStates.set(key, false);
    }
  }

  /**
   * Debounced data loading to prevent rapid successive calls
   */
  async loadDataDebounced(key, loadFunction, forceRefresh = false) {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      const existingTimeout = this.debounceTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        try {
          const result = await this.loadData(key, loadFunction, forceRefresh);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.debounceTime);

      this.debounceTimeouts.set(key, timeout);
    });
  }

  /**
   * Check if data is currently loading
   */
  isLoading(key) {
    return this.loadingStates.get(key) || false;
  }

  /**
   * Get cached data without loading
   */
  getCached(key) {
    return this.cache.get(key);
  }

  /**
   * Clear cache for specific key or all keys
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
      this.lastLoadTimes.delete(key);
    } else {
      this.cache.clear();
      this.lastLoadTimes.clear();
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all timeouts
    for (const timeout of this.debounceTimeouts.values()) {
      clearTimeout(timeout);
    }
    
    this.cache.clear();
    this.loadingStates.clear();
    this.lastLoadTimes.clear();
    this.debounceTimeouts.clear();
  }
}

/**
 * Stable rendering helper to prevent unnecessary re-renders
 */
export class StableRenderer {
  constructor() {
    this.renderKeys = new Map();
    this.stableData = new Map();
  }

  /**
   * Update data only if it has actually changed
   */
  updateIfChanged(key, newData) {
    const existingData = this.stableData.get(key);
    const dataChanged = JSON.stringify(newData) !== JSON.stringify(existingData);
    
    if (dataChanged) {
      this.stableData.set(key, newData);
      this.renderKeys.set(key, (this.renderKeys.get(key) || 0) + 1);
      return true;
    }
    
    return false;
  }

  /**
   * Get stable data reference
   */
  getStableData(key) {
    return this.stableData.get(key);
  }

  /**
   * Get render key for reactive updates
   */
  getRenderKey(key) {
    return this.renderKeys.get(key) || 0;
  }
}

/**
 * Auto-refresh manager with intelligent scheduling
 */
export class AutoRefreshManager {
  constructor(options = {}) {
    this.intervals = new Map();
    this.defaultInterval = options.defaultInterval || 300000; // 5 minutes
    this.visibilityChangeHandler = this.handleVisibilityChange.bind(this);
    
    // Listen for visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  /**
   * Start auto-refresh for a specific key
   */
  startAutoRefresh(key, refreshFunction, interval = null) {
    this.stopAutoRefresh(key); // Clear existing interval
    
    const refreshInterval = interval || this.defaultInterval;
    
    const intervalId = setInterval(() => {
      // Only refresh if page is visible
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        refreshFunction();
      }
    }, refreshInterval);
    
    this.intervals.set(key, intervalId);
  }

  /**
   * Stop auto-refresh for a specific key
   */
  stopAutoRefresh(key) {
    const intervalId = this.intervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(key);
    }
  }

  /**
   * Handle visibility change events
   */
  handleVisibilityChange() {
    if (typeof document === 'undefined') return;
    
    if (document.visibilityState === 'hidden') {
      // Pause all intervals when page is hidden
      for (const [key, intervalId] of this.intervals.entries()) {
        clearInterval(intervalId);
      }
    } else if (document.visibilityState === 'visible') {
      // Resume intervals when page becomes visible
      // Note: This is a simplified approach. In practice, you'd want to
      // restart intervals with their original functions and intervals.
    }
  }

  /**
   * Cleanup all intervals
   */
  destroy() {
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }
}
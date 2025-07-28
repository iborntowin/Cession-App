/**
 * Anti-Flickering System
 * Prevents UI flickering by managing loading states and data updates intelligently
 */

// Global registry to track active loading operations
const activeOperations = new Map();
const dataCache = new Map();

/**
 * Prevents multiple simultaneous operations on the same resource
 */
export function preventDuplicateOperation(key, operation) {
  if (activeOperations.has(key)) {
    console.log(`Operation ${key} already in progress, skipping duplicate`);
    return activeOperations.get(key);
  }

  const promise = operation().finally(() => {
    activeOperations.delete(key);
  });

  activeOperations.set(key, promise);
  return promise;
}

/**
 * Stable data updater that only triggers updates when data actually changes
 */
export function updateDataIfChanged(key, newData, currentData, updateCallback) {
  const cacheKey = `${key}_${JSON.stringify(newData)}`;
  
  // Check if data actually changed
  if (JSON.stringify(newData) === JSON.stringify(currentData)) {
    console.log(`Data for ${key} unchanged, skipping update`);
    return false;
  }

  // Check cache to prevent duplicate processing
  if (dataCache.has(cacheKey)) {
    console.log(`Data for ${key} already processed, skipping`);
    return false;
  }

  // Update cache and trigger callback
  dataCache.set(cacheKey, true);
  updateCallback(newData);
  
  // Clean cache after 5 minutes to prevent memory leaks
  setTimeout(() => {
    dataCache.delete(cacheKey);
  }, 300000);

  return true;
}

/**
 * Debounced function executor
 */
const debounceTimers = new Map();

export function debounce(key, func, delay = 300) {
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key));
  }

  const timer = setTimeout(() => {
    debounceTimers.delete(key);
    func();
  }, delay);

  debounceTimers.set(key, timer);
}

/**
 * Stable loading state manager
 */
export class StableLoadingManager {
  constructor() {
    this.loadingStates = new Map();
    this.loadingCallbacks = new Map();
  }

  setLoading(key, isLoading, callback = null) {
    const currentState = this.loadingStates.get(key);
    
    // Only update if state actually changed
    if (currentState !== isLoading) {
      this.loadingStates.set(key, isLoading);
      
      if (callback) {
        callback(isLoading);
      }
      
      // Notify registered callbacks
      const callbacks = this.loadingCallbacks.get(key) || [];
      callbacks.forEach(cb => cb(isLoading));
    }
  }

  isLoading(key) {
    return this.loadingStates.get(key) || false;
  }

  onLoadingChange(key, callback) {
    if (!this.loadingCallbacks.has(key)) {
      this.loadingCallbacks.set(key, []);
    }
    this.loadingCallbacks.get(key).push(callback);
  }

  cleanup() {
    this.loadingStates.clear();
    this.loadingCallbacks.clear();
  }
}

// Global instance
export const globalLoadingManager = new StableLoadingManager();

/**
 * Cleanup function to prevent memory leaks
 */
export function cleanup() {
  activeOperations.clear();
  dataCache.clear();
  debounceTimers.forEach(timer => clearTimeout(timer));
  debounceTimers.clear();
  globalLoadingManager.cleanup();
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}
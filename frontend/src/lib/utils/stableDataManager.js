/**
 * Stable Data Manager
 * Prevents unnecessary re-renders and flickering by managing data updates intelligently
 */

class StableDataManager {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Update an array while maintaining stability
   * Only updates if there are actual changes
   */
  updateArray(currentArray, newArray, keyField = 'id') {
    if (!Array.isArray(newArray)) {
      return currentArray;
    }

    // If current array is empty, return new array
    if (!currentArray || currentArray.length === 0) {
      return [...newArray];
    }

    // Create maps for efficient comparison
    const currentMap = new Map();
    const newMap = new Map();

    currentArray.forEach(item => {
      if (item && item[keyField] !== undefined) {
        currentMap.set(item[keyField], item);
      }
    });

    newArray.forEach(item => {
      if (item && item[keyField] !== undefined) {
        newMap.set(item[keyField], item);
      }
    });

    // Check if arrays are essentially the same
    if (currentMap.size === newMap.size) {
      let hasChanges = false;
      
      for (const [key, newItem] of newMap) {
        const currentItem = currentMap.get(key);
        if (!currentItem || this.hasObjectChanged(currentItem, newItem)) {
          hasChanges = true;
          break;
        }
      }

      if (!hasChanges) {
        return currentArray; // Return existing array to maintain reference stability
      }
    }

    // Arrays are different, return new array
    return [...newArray];
  }

  /**
   * Update an object while maintaining stability
   */
  updateObject(currentObject, newObject) {
    if (!newObject || typeof newObject !== 'object') {
      return currentObject;
    }

    if (!currentObject || this.hasObjectChanged(currentObject, newObject)) {
      return { ...newObject };
    }

    return currentObject; // Return existing object to maintain reference stability
  }

  /**
   * Check if two objects have meaningful differences
   */
  hasObjectChanged(obj1, obj2) {
    if (obj1 === obj2) return false;
    if (!obj1 || !obj2) return true;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 !== obj2;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return true;

    for (const key of keys1) {
      if (!keys2.includes(key)) return true;
      
      const val1 = obj1[key];
      const val2 = obj2[key];

      // Handle nested objects
      if (typeof val1 === 'object' && typeof val2 === 'object') {
        if (val1 === null && val2 === null) continue;
        if (val1 === null || val2 === null) return true;
        if (this.hasObjectChanged(val1, val2)) return true;
      } else if (val1 !== val2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Debounce function calls to prevent excessive updates
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function calls to limit execution frequency
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Cache data with expiration
   */
  setCache(key, data, ttl = 30000) { // 30 seconds default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached data if not expired
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clear cache
   */
  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Merge arrays while preserving order and avoiding duplicates
   */
  mergeArrays(arr1, arr2, keyField = 'id') {
    if (!Array.isArray(arr1)) arr1 = [];
    if (!Array.isArray(arr2)) arr2 = [];

    const merged = [...arr1];
    const existingKeys = new Set(arr1.map(item => item[keyField]));

    arr2.forEach(item => {
      if (item && item[keyField] !== undefined && !existingKeys.has(item[keyField])) {
        merged.push(item);
        existingKeys.add(item[keyField]);
      }
    });

    return merged;
  }

  /**
   * Filter array with stable results
   */
  stableFilter(array, filterFn) {
    if (!Array.isArray(array)) return [];
    
    const filtered = array.filter(filterFn);
    
    // Return the same array reference if no items were filtered out
    if (filtered.length === array.length) {
      return array;
    }
    
    return filtered;
  }

  /**
   * Sort array with stable results
   */
  stableSort(array, compareFn) {
    if (!Array.isArray(array) || array.length <= 1) return array;
    
    const sorted = [...array].sort(compareFn);
    
    // Check if order actually changed
    let orderChanged = false;
    for (let i = 0; i < array.length; i++) {
      if (array[i] !== sorted[i]) {
        orderChanged = true;
        break;
      }
    }
    
    return orderChanged ? sorted : array;
  }
}

// Export singleton instance
export const stableDataManager = new StableDataManager();
export default stableDataManager;
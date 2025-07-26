// Performance monitoring utilities for debugging flickering issues

export class PerformanceMonitor {
  constructor(componentName) {
    this.componentName = componentName;
    this.metrics = new Map();
    this.renderCount = 0;
    this.lastRenderTime = 0;
  }

  // Track render cycles
  trackRender() {
    this.renderCount++;
    const now = performance.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    
    if (this.renderCount > 1 && timeSinceLastRender < 100) {
      console.warn(`${this.componentName}: Rapid re-render detected (${timeSinceLastRender.toFixed(2)}ms since last render)`);
    }
    
    this.lastRenderTime = now;
    
    // Log excessive renders
    if (this.renderCount % 10 === 0) {
      console.log(`${this.componentName}: ${this.renderCount} renders so far`);
    }
  }

  // Track function execution time
  trackFunction(name, fn) {
    return (...args) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      const duration = end - start;
      if (!this.metrics.has(name)) {
        this.metrics.set(name, { calls: 0, totalTime: 0, maxTime: 0 });
      }
      
      const metric = this.metrics.get(name);
      metric.calls++;
      metric.totalTime += duration;
      metric.maxTime = Math.max(metric.maxTime, duration);
      
      // Warn about slow functions
      if (duration > 50) {
        console.warn(`${this.componentName}.${name}: Slow execution (${duration.toFixed(2)}ms)`);
      }
      
      return result;
    };
  }

  // Track async function execution time
  trackAsyncFunction(name, fn) {
    return async (...args) => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      
      const duration = end - start;
      if (!this.metrics.has(name)) {
        this.metrics.set(name, { calls: 0, totalTime: 0, maxTime: 0 });
      }
      
      const metric = this.metrics.get(name);
      metric.calls++;
      metric.totalTime += duration;
      metric.maxTime = Math.max(metric.maxTime, duration);
      
      // Warn about slow async functions
      if (duration > 100) {
        console.warn(`${this.componentName}.${name}: Slow async execution (${duration.toFixed(2)}ms)`);
      }
      
      return result;
    };
  }

  // Get performance report
  getReport() {
    const report = {
      component: this.componentName,
      renderCount: this.renderCount,
      functions: {}
    };

    for (const [name, metric] of this.metrics) {
      report.functions[name] = {
        calls: metric.calls,
        avgTime: metric.totalTime / metric.calls,
        maxTime: metric.maxTime,
        totalTime: metric.totalTime
      };
    }

    return report;
  }

  // Log performance report
  logReport() {
    const report = this.getReport();
    console.group(`Performance Report: ${this.componentName}`);
    console.log(`Total renders: ${report.renderCount}`);
    
    if (Object.keys(report.functions).length > 0) {
      console.log('Function performance:');
      for (const [name, stats] of Object.entries(report.functions)) {
        console.log(`  ${name}: ${stats.calls} calls, avg: ${stats.avgTime.toFixed(2)}ms, max: ${stats.maxTime.toFixed(2)}ms`);
      }
    }
    
    console.groupEnd();
  }
}

// Debounce utility with performance tracking
export function createDebounce(fn, delay, name = 'anonymous') {
  let timeoutId;
  let callCount = 0;
  
  return function debounced(...args) {
    callCount++;
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const start = performance.now();
      fn.apply(this, args);
      const end = performance.now();
      
      if (end - start > 50) {
        console.warn(`Debounced function ${name}: Slow execution (${(end - start).toFixed(2)}ms) after ${callCount} calls`);
      }
      
      callCount = 0;
    }, delay);
  };
}

// Memoization utility with cache size limits
export function createMemoizer(maxSize = 100) {
  const cache = new Map();
  
  return function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
    return function memoized(...args) {
      const key = keyGenerator(...args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = fn.apply(this, args);
      
      // Limit cache size
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      cache.set(key, result);
      return result;
    };
  };
}

// Batch update utility to prevent rapid successive updates
export function createBatchUpdater(updateFn, delay = 16) {
  let pendingUpdate = false;
  let updateArgs = null;
  
  return function batchUpdate(...args) {
    updateArgs = args;
    
    if (!pendingUpdate) {
      pendingUpdate = true;
      requestAnimationFrame(() => {
        updateFn.apply(this, updateArgs);
        pendingUpdate = false;
        updateArgs = null;
      });
    }
  };
}

// Visibility change handler to pause expensive operations when page is hidden
export function createVisibilityHandler(onVisible, onHidden) {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onVisible?.();
      } else {
        onHidden?.();
      }
    });
  }
}
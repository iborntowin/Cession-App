/**
 * Performance monitoring and optimization utilities
 * Tracks memory usage, renders, and provides optimization recommendations
 */

/**
 * Performance metrics tracker
 */
class PerformanceTracker {
  constructor() {
    this.metrics = {
      renders: 0,
      apiCalls: 0,
      memoryUsage: [],
      renderTimes: [],
      apiResponseTimes: [],
      errors: 0
    };
    this.observers = [];
    this.startTime = performance.now();
  }

  // Track component renders
  trackRender(componentName, renderTime) {
    this.metrics.renders++;
    this.metrics.renderTimes.push({
      component: componentName,
      time: renderTime,
      timestamp: Date.now()
    });

    // Keep only last 50 render times
    if (this.metrics.renderTimes.length > 50) {
      this.metrics.renderTimes = this.metrics.renderTimes.slice(-50);
    }

    // Alert on slow renders
    if (renderTime > 16.67) { // 60fps threshold
      console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  // Track API calls
  trackApiCall(endpoint, responseTime, success = true) {
    this.metrics.apiCalls++;
    this.metrics.apiResponseTimes.push({
      endpoint,
      responseTime,
      success,
      timestamp: Date.now()
    });

    if (!success) {
      this.metrics.errors++;
    }

    // Keep only last 100 API calls
    if (this.metrics.apiResponseTimes.length > 100) {
      this.metrics.apiResponseTimes = this.metrics.apiResponseTimes.slice(-100);
    }

    // Alert on slow API calls
    if (responseTime > 1000) {
      console.warn(`🐌 Slow API call: ${endpoint} took ${responseTime}ms`);
    }
  }

  // Track memory usage
  trackMemoryUsage() {
    if (performance.memory) {
      const memoryInfo = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
        timestamp: Date.now()
      };

      this.metrics.memoryUsage.push(memoryInfo);

      // Keep only last 20 memory readings
      if (this.metrics.memoryUsage.length > 20) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-20);
      }

      // Alert on high memory usage
      if (memoryInfo.used > 100) {
        console.warn(`🧠 High memory usage: ${memoryInfo.used}MB`);
      }

      return memoryInfo;
    }
    return null;
  }

  // Get performance summary
  getSummary() {
    const now = performance.now();
    const uptime = now - this.startTime;
    
    const avgRenderTime = this.metrics.renderTimes.length > 0
      ? this.metrics.renderTimes.reduce((sum, r) => sum + r.time, 0) / this.metrics.renderTimes.length
      : 0;

    const avgApiResponseTime = this.metrics.apiResponseTimes.length > 0
      ? this.metrics.apiResponseTimes.reduce((sum, r) => sum + r.responseTime, 0) / this.metrics.apiResponseTimes.length
      : 0;

    const currentMemory = this.trackMemoryUsage();

    return {
      uptime: Math.round(uptime),
      totalRenders: this.metrics.renders,
      totalApiCalls: this.metrics.apiCalls,
      totalErrors: this.metrics.errors,
      averageRenderTime: Math.round(avgRenderTime * 100) / 100,
      averageApiResponseTime: Math.round(avgApiResponseTime),
      currentMemoryUsage: currentMemory,
      errorRate: this.metrics.apiCalls > 0 ? (this.metrics.errors / this.metrics.apiCalls * 100).toFixed(2) : 0
    };
  }

  // Get recommendations
  getRecommendations() {
    const recommendations = [];
    const summary = this.getSummary();

    if (summary.averageRenderTime > 16.67) {
      recommendations.push({
        type: 'performance',
        level: 'warning',
        message: `Average render time (${summary.averageRenderTime}ms) is above 60fps threshold. Consider optimizing reactive statements.`
      });
    }

    if (summary.averageApiResponseTime > 1000) {
      recommendations.push({
        type: 'api',
        level: 'warning',
        message: `Average API response time (${summary.averageApiResponseTime}ms) is slow. Consider implementing caching or pagination.`
      });
    }

    if (summary.currentMemoryUsage && summary.currentMemoryUsage.used > 100) {
      recommendations.push({
        type: 'memory',
        level: 'error',
        message: `High memory usage (${summary.currentMemoryUsage.used}MB). Check for memory leaks in Chart.js or reactive subscriptions.`
      });
    }

    if (summary.errorRate > 10) {
      recommendations.push({
        type: 'reliability',
        level: 'error',
        message: `High error rate (${summary.errorRate}%). Investigate API failures and implement better error handling.`
      });
    }

    if (this.metrics.renders > 1000 && summary.uptime < 300000) { // >1000 renders in <5 minutes
      recommendations.push({
        type: 'optimization',
        level: 'info',
        message: 'High render frequency detected. Consider debouncing reactive statements or using stores more efficiently.'
      });
    }

    return recommendations;
  }

  // Clear metrics
  reset() {
    this.metrics = {
      renders: 0,
      apiCalls: 0,
      memoryUsage: [],
      renderTimes: [],
      apiResponseTimes: [],
      errors: 0
    };
    this.startTime = performance.now();
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

/**
 * Memory leak detector for Chart.js
 */
export class ChartMemoryLeakDetector {
  constructor() {
    this.chartInstances = new Map();
    this.destroyedCharts = new Set();
  }

  registerChart(id, chart) {
    this.chartInstances.set(id, {
      chart,
      created: Date.now(),
      component: this.getComponentName()
    });
  }

  unregisterChart(id) {
    if (this.chartInstances.has(id)) {
      this.destroyedCharts.add(id);
      this.chartInstances.delete(id);
    }
  }

  getComponentName() {
    // Try to get component name from stack trace
    const stack = new Error().stack;
    const match = stack.match(/at (\w+)\.svelte/);
    return match ? match[1] : 'unknown';
  }

  detectLeaks() {
    const leaks = [];
    const now = Date.now();
    
    this.chartInstances.forEach((info, id) => {
      const age = now - info.created;
      
      // Chart instances older than 5 minutes might be leaks
      if (age > 300000) {
        leaks.push({
          id,
          component: info.component,
          age: Math.round(age / 1000),
          chart: info.chart
        });
      }
    });

    if (leaks.length > 0) {
      console.warn('🔍 Potential Chart.js memory leaks detected:', leaks);
      
      // Try to auto-cleanup
      leaks.forEach(leak => {
        try {
          if (leak.chart && typeof leak.chart.destroy === 'function') {
            leak.chart.destroy();
            this.unregisterChart(leak.id);
            console.log(`🧹 Auto-cleaned chart leak: ${leak.id}`);
          }
        } catch (error) {
          console.error(`Failed to cleanup chart ${leak.id}:`, error);
        }
      });
    }

    return leaks;
  }

  getStats() {
    return {
      activeCharts: this.chartInstances.size,
      destroyedCharts: this.destroyedCharts.size,
      instances: Array.from(this.chartInstances.entries()).map(([id, info]) => ({
        id,
        component: info.component,
        age: Math.round((Date.now() - info.created) / 1000)
      }))
    };
  }
}

// Global chart leak detector
export const chartLeakDetector = new ChartMemoryLeakDetector();

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Track memory usage periodically
  setInterval(() => {
    performanceTracker.trackMemoryUsage();
  }, 30000);

  // Check for chart leaks periodically
  setInterval(() => {
    chartLeakDetector.detectLeaks();
  }, 60000);
}

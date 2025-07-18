import { ErrorHandler } from './errorHandling';

/**
 * Global error handler for unhandled promise rejections and errors
 */
class GlobalErrorHandler {
  constructor() {
    this.isInitialized = false;
    this.errorQueue = [];
    this.maxQueueSize = 50;
  }

  /**
   * Initialize global error handling
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    // Handle unhandled promise rejections
    if (typeof global !== 'undefined' && global.ErrorUtils) {
      // React Native specific error handling
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.handleGlobalError(error, { isFatal, source: 'ErrorUtils' });
        
        // Call original handler to maintain default behavior
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Handle unhandled promise rejections (if available)
    if (typeof global !== 'undefined' && global.addEventListener) {
      global.addEventListener('unhandledrejection', (event) => {
        this.handleGlobalError(event.reason, { 
          source: 'unhandledrejection',
          promise: event.promise 
        });
      });
    }

    this.isInitialized = true;
    console.log('Global error handler initialized');
  }

  /**
   * Handle global errors
   */
  handleGlobalError(error, context = {}) {
    try {
      // Add to error queue
      const errorEntry = {
        error,
        context,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };

      this.addToQueue(errorEntry);

      // Log the error
      ErrorHandler.logError(error, 'Global Error Handler', {
        ...context,
        queueSize: this.errorQueue.length
      });

      // In development, also log to console for debugging
      if (__DEV__) {
        console.group('🚨 Global Error Caught');
        console.error('Error:', error);
        console.error('Context:', context);
        console.error('Stack:', error?.stack);
        console.groupEnd();
      }

    } catch (handlerError) {
      // Prevent infinite loops if error handler itself fails
      console.error('Error in global error handler:', handlerError);
    }
  }

  /**
   * Add error to queue with size management
   */
  addToQueue(errorEntry) {
    this.errorQueue.push(errorEntry);
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10) {
    return this.errorQueue.slice(-count);
  }

  /**
   * Clear error queue
   */
  clearErrorQueue() {
    this.errorQueue = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentErrors = this.errorQueue.filter(e => 
      new Date(e.timestamp) > oneHourAgo
    );

    const dailyErrors = this.errorQueue.filter(e => 
      new Date(e.timestamp) > oneDayAgo
    );

    const errorTypes = {};
    this.errorQueue.forEach(e => {
      const type = e.error?.name || 'Unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    return {
      total: this.errorQueue.length,
      lastHour: recentErrors.length,
      lastDay: dailyErrors.length,
      types: errorTypes,
      oldestError: this.errorQueue[0]?.timestamp,
      newestError: this.errorQueue[this.errorQueue.length - 1]?.timestamp
    };
  }

  /**
   * Check if app is in a degraded state
   */
  isAppDegraded() {
    const stats = this.getErrorStats();
    
    // Consider app degraded if:
    // - More than 5 errors in the last hour
    // - More than 20 errors in the last day
    // - Any fatal errors recently
    const recentFatalErrors = this.errorQueue
      .filter(e => new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000))
      .filter(e => e.context?.isFatal);

    return stats.lastHour > 5 || 
           stats.lastDay > 20 || 
           recentFatalErrors.length > 0;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const stats = this.getErrorStats();
    const isDegraded = this.isAppDegraded();

    return {
      healthy: !isDegraded,
      degraded: isDegraded,
      stats,
      recommendations: this.getHealthRecommendations(stats, isDegraded)
    };
  }

  /**
   * Get health recommendations
   */
  getHealthRecommendations(stats, isDegraded) {
    const recommendations = [];

    if (isDegraded) {
      recommendations.push('App is experiencing issues - consider restarting');
    }

    if (stats.lastHour > 3) {
      recommendations.push('High error rate detected - check network connection');
    }

    if (stats.types['NetworkError'] > 5) {
      recommendations.push('Network issues detected - verify internet connection');
    }

    if (stats.types['DataSyncError'] > 3) {
      recommendations.push('Data sync issues - try refreshing data');
    }

    return recommendations;
  }
}

// Create singleton instance
const globalErrorHandler = new GlobalErrorHandler();

export default globalErrorHandler;

/**
 * Initialize global error handling (call this in App.js)
 */
export const initializeGlobalErrorHandling = () => {
  globalErrorHandler.initialize();
};

/**
 * Manually report an error to the global handler
 */
export const reportGlobalError = (error, context = {}) => {
  globalErrorHandler.handleGlobalError(error, context);
};

/**
 * Get app health status
 */
export const getAppHealthStatus = () => {
  return globalErrorHandler.getHealthStatus();
};

/**
 * Get recent errors for debugging
 */
export const getRecentErrors = (count = 10) => {
  return globalErrorHandler.getRecentErrors(count);
};
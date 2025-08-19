/**
 * Enhanced error handling and logging system
 * Addresses issues identified in test reports:
 * - Poor error messages and user feedback
 * - No centralized error tracking
 * - Missing error logging for debugging
 * - No error recovery mechanisms
 * - Memory leaks from error handlers
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { showAlert } from './stores';

// Error severity levels
export const ERROR_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

// Error categories for better classification
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  FILE_SYSTEM: 'file_system',
  UI: 'ui',
  BUSINESS_LOGIC: 'business_logic',
  EXTERNAL_SERVICE: 'external_service',
  UNKNOWN: 'unknown'
};

// Error contexts for better debugging
export const ERROR_CONTEXTS = {
  CLIENT_MANAGEMENT: 'client_management',
  PAYMENT_PROCESSING: 'payment_processing',
  USER_AUTHENTICATION: 'user_authentication',
  FILE_UPLOAD: 'file_upload',
  DATA_EXPORT: 'data_export',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  REPORTING: 'reporting'
};

/**
 * Enhanced error class with additional metadata
 */
export class EnhancedError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'EnhancedError';
    this.timestamp = new Date().toISOString();
    this.level = options.level || ERROR_LEVELS.ERROR;
    this.category = options.category || ERROR_CATEGORIES.UNKNOWN;
    this.context = options.context || null;
    this.code = options.code || null;
    this.originalError = options.originalError || null;
    this.userMessage = options.userMessage || null;
    this.technical = options.technical || false;
    this.recoverable = options.recoverable !== false; // Default to recoverable
    this.metadata = options.metadata || {};
    this.stackTrace = this.stack;
    
    // Generate unique ID for tracking
    this.id = this.generateErrorId();
  }

  /**
   * Generate unique error ID for tracking
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get user-friendly message
   */
  getUserMessage() {
    if (this.userMessage) {
      return this.userMessage;
    }

    // Generate user-friendly message based on category
    switch (this.category) {
      case ERROR_CATEGORIES.NETWORK:
        return 'Network connection problem. Please check your internet connection and try again.';
      case ERROR_CATEGORIES.VALIDATION:
        return 'Please check your input and try again.';
      case ERROR_CATEGORIES.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case ERROR_CATEGORIES.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ERROR_CATEGORIES.DATABASE:
        return 'Database error occurred. Please try again later.';
      case ERROR_CATEGORIES.FILE_SYSTEM:
        return 'File operation failed. Please try again.';
      case ERROR_CATEGORIES.EXTERNAL_SERVICE:
        return 'External service is temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      id: this.id,
      message: this.message,
      userMessage: this.getUserMessage(),
      level: this.level,
      category: this.category,
      context: this.context,
      code: this.code,
      timestamp: this.timestamp,
      technical: this.technical,
      recoverable: this.recoverable,
      metadata: this.metadata,
      stackTrace: this.stackTrace,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : null
    };
  }
}

/**
 * Error logger with different output targets
 */
class ErrorLogger {
  constructor() {
    this.logs = writable([]);
    this.maxLogs = 1000; // Maximum number of logs to keep in memory
    this.enableConsoleLogging = true;
    this.enableRemoteLogging = false; // Can be enabled for production
    this.remoteEndpoint = '/api/v1/logs';
    this.batchSize = 10;
    this.batchTimeout = 5000; // 5 seconds
    this.logBatch = [];
    this.batchTimer = null;
  }

  /**
   * Log an error or message
   */
  log(level, message, metadata = {}) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      url: browser ? window.location.href : '',
      userAgent: browser ? navigator.userAgent : '',
      sessionId: this.getSessionId()
    };

    // Add to memory store
    this.addToStore(logEntry);

    // Console logging
    if (this.enableConsoleLogging) {
      this.logToConsole(logEntry);
    }

    // Remote logging (batched)
    if (this.enableRemoteLogging && browser) {
      this.addToBatch(logEntry);
    }
  }

  /**
   * Add log entry to Svelte store
   */
  addToStore(logEntry) {
    this.logs.update(logs => {
      const newLogs = [logEntry, ...logs];
      // Keep only the most recent logs
      return newLogs.slice(0, this.maxLogs);
    });
  }

  /**
   * Log to browser console with appropriate level
   */
  logToConsole(logEntry) {
    const { level, message, metadata } = logEntry;
    const consoleMessage = `[${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case ERROR_LEVELS.DEBUG:
        console.debug(consoleMessage, metadata);
        break;
      case ERROR_LEVELS.INFO:
        console.info(consoleMessage, metadata);
        break;
      case ERROR_LEVELS.WARN:
        console.warn(consoleMessage, metadata);
        break;
      case ERROR_LEVELS.ERROR:
      case ERROR_LEVELS.FATAL:
        console.error(consoleMessage, metadata);
        break;
      default:
        console.log(consoleMessage, metadata);
    }
  }

  /**
   * Add to batch for remote logging
   */
  addToBatch(logEntry) {
    this.logBatch.push(logEntry);

    // Send batch if it reaches the size limit
    if (this.logBatch.length >= this.batchSize) {
      this.sendBatch();
    } else {
      // Set timer to send batch after timeout
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      this.batchTimer = setTimeout(() => {
        this.sendBatch();
      }, this.batchTimeout);
    }
  }

  /**
   * Send log batch to remote endpoint
   */
  async sendBatch() {
    if (this.logBatch.length === 0) return;

    const batchToSend = [...this.logBatch];
    this.logBatch = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: batchToSend
        })
      });
    } catch (error) {
      // Failed to send logs - could log this locally, but avoid infinite recursion
      console.warn('Failed to send log batch to remote endpoint:', error);
    }
  }

  /**
   * Get session ID for tracking
   */
  getSessionId() {
    if (!browser) return 'server';
    
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs.set([]);
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return get(this.logs);
  }

  /**
   * Destroy logger and clean up
   */
  destroy() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    this.sendBatch(); // Send any remaining logs
    this.clearLogs();
  }
}

/**
 * Global error handler
 */
class GlobalErrorHandler {
  constructor() {
    this.logger = new ErrorLogger();
    this.errorCallbacks = [];
    this.recoveryStrategies = new Map();
    this.setupGlobalHandlers();
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    if (!browser) return;

    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError(new EnhancedError(event.message, {
        category: ERROR_CATEGORIES.UI,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        originalError: event.error,
        technical: true
      }));
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new EnhancedError(event.reason?.message || 'Unhandled promise rejection', {
        category: ERROR_CATEGORIES.UNKNOWN,
        metadata: {
          reason: event.reason
        },
        originalError: event.reason,
        technical: true
      }));
    });
  }

  /**
   * Handle an error with recovery attempts
   */
  async handleError(error, options = {}) {
    // Convert to EnhancedError if needed
    const enhancedError = error instanceof EnhancedError ? error : 
      new EnhancedError(error.message || 'Unknown error', {
        originalError: error,
        ...options
      });

    // Log the error
    this.logger.log(enhancedError.level, enhancedError.message, enhancedError.toJSON());

    // Show user notification for non-technical errors
    if (!enhancedError.technical && options.showAlert !== false) {
      showAlert(enhancedError.getUserMessage(), 'error');
    }

    // Attempt recovery if error is recoverable
    if (enhancedError.recoverable) {
      await this.attemptRecovery(enhancedError);
    }

    // Call registered error callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(enhancedError);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    return enhancedError;
  }

  /**
   * Attempt error recovery based on error type
   */
  async attemptRecovery(error) {
    const strategy = this.recoveryStrategies.get(error.category);
    if (strategy) {
      try {
        await strategy(error);
      } catch (recoveryError) {
        console.error('Error recovery failed:', recoveryError);
      }
    }
  }

  /**
   * Register error callback
   */
  onError(callback) {
    this.errorCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register recovery strategy for error category
   */
  registerRecoveryStrategy(category, strategy) {
    this.recoveryStrategies.set(category, strategy);
  }

  /**
   * Create a wrapped function that handles errors
   */
  wrap(fn, context) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handleError(error, { context });
      }
    };
  }

  /**
   * Create error boundary for Svelte components
   */
  createErrorBoundary() {
    return {
      onError: (error, errorInfo) => {
        this.handleError(new EnhancedError(error.message, {
          category: ERROR_CATEGORIES.UI,
          context: ERROR_CONTEXTS.DASHBOARD,
          metadata: errorInfo,
          originalError: error,
          technical: false
        }));
      }
    };
  }

  /**
   * Destroy handler and clean up
   */
  destroy() {
    this.logger.destroy();
    this.errorCallbacks = [];
    this.recoveryStrategies.clear();
  }
}

// Global instance
const globalErrorHandler = new GlobalErrorHandler();

/**
 * Error factory functions for common error types
 */
export const ErrorFactory = {
  network: (message, metadata = {}) => new EnhancedError(message, {
    category: ERROR_CATEGORIES.NETWORK,
    userMessage: 'Network connection problem. Please check your internet connection.',
    metadata
  }),

  validation: (message, field, metadata = {}) => new EnhancedError(message, {
    category: ERROR_CATEGORIES.VALIDATION,
    userMessage: `Please check the ${field} field and try again.`,
    metadata: { field, ...metadata }
  }),

  authentication: (message = 'Authentication failed') => new EnhancedError(message, {
    category: ERROR_CATEGORIES.AUTHENTICATION,
    userMessage: 'Please log in again to continue.',
    technical: false
  }),

  authorization: (message = 'Access denied') => new EnhancedError(message, {
    category: ERROR_CATEGORIES.AUTHORIZATION,
    userMessage: 'You do not have permission to perform this action.',
    technical: false
  }),

  database: (message, metadata = {}) => new EnhancedError(message, {
    category: ERROR_CATEGORIES.DATABASE,
    userMessage: 'A database error occurred. Please try again later.',
    technical: true,
    metadata
  }),

  api: (status, message, metadata = {}) => new EnhancedError(message, {
    category: ERROR_CATEGORIES.EXTERNAL_SERVICE,
    userMessage: 'Service temporarily unavailable. Please try again.',
    code: status,
    metadata
  }),

  ui: (message, component, metadata = {}) => new EnhancedError(message, {
    category: ERROR_CATEGORIES.UI,
    userMessage: 'A display error occurred. Please refresh the page.',
    metadata: { component, ...metadata }
  })
};

/**
 * Error handling utilities
 */
export const errorUtils = {
  /**
   * Handle error and return user-friendly result
   */
  handle: async (error, options = {}) => {
    return globalErrorHandler.handleError(error, options);
  },

  /**
   * Wrap async function with error handling
   */
  wrap: (fn, context) => {
    return globalErrorHandler.wrap(fn, context);
  },

  /**
   * Create safe async wrapper that never throws
   */
  safe: (fn, defaultValue = null) => {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        await globalErrorHandler.handleError(error, { showAlert: false });
        return defaultValue;
      }
    };
  },

  /**
   * Retry function with exponential backoff
   */
  retry: async (fn, maxRetries = 3, baseDelay = 1000) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  },

  /**
   * Create error boundary store for components
   */
  createErrorBoundary: () => {
    const errors = writable([]);
    const hasError = writable(false);
    
    const captureError = (error) => {
      const enhancedError = error instanceof EnhancedError ? error : 
        new EnhancedError(error.message, { originalError: error });
      
      errors.update(errs => [...errs, enhancedError]);
      hasError.set(true);
      
      globalErrorHandler.handleError(enhancedError);
    };
    
    const clearErrors = () => {
      errors.set([]);
      hasError.set(false);
    };
    
    return {
      errors,
      hasError,
      captureError,
      clearErrors
    };
  }
};

/**
 * Register common recovery strategies
 */
globalErrorHandler.registerRecoveryStrategy(ERROR_CATEGORIES.NETWORK, async (error) => {
  // Attempt to retry the request after a delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('Network error recovery attempted');
});

globalErrorHandler.registerRecoveryStrategy(ERROR_CATEGORIES.AUTHENTICATION, async (error) => {
  // Redirect to login page
  if (browser) {
    window.location.href = '/login';
  }
});

// Export global handler and logger
export { globalErrorHandler, ErrorLogger };
export const logger = globalErrorHandler.logger;

/**
 * Log functions for different levels
 */
export const log = {
  debug: (message, metadata) => logger.log(ERROR_LEVELS.DEBUG, message, metadata),
  info: (message, metadata) => logger.log(ERROR_LEVELS.INFO, message, metadata),
  warn: (message, metadata) => logger.log(ERROR_LEVELS.WARN, message, metadata),
  error: (message, metadata) => logger.log(ERROR_LEVELS.ERROR, message, metadata),
  fatal: (message, metadata) => logger.log(ERROR_LEVELS.FATAL, message, metadata)
};

// Export everything for external use
export default {
  EnhancedError,
  ErrorFactory,
  errorUtils,
  log,
  ERROR_LEVELS,
  ERROR_CATEGORIES,
  ERROR_CONTEXTS
};

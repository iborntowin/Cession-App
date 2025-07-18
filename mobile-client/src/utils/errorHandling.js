/**
 * Error handling utilities for mobile app
 */

/**
 * Custom error classes
 */
export class NetworkError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.isRetryable = true;
  }
}

export class ValidationError extends Error {
  constructor(message, validationErrors = []) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
    this.isRetryable = false;
  }
}

export class CacheError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'CacheError';
    this.originalError = originalError;
    this.isRetryable = false;
  }
}

export class DataSyncError extends Error {
  constructor(message, syncAttempts = 0, originalError = null) {
    super(message);
    this.name = 'DataSyncError';
    this.syncAttempts = syncAttempts;
    this.originalError = originalError;
    this.isRetryable = syncAttempts < 3;
  }
}

/**
 * Error classification and handling
 */
export class ErrorHandler {
  static classify(error) {
    if (!error) {
      return {
        type: 'unknown',
        severity: 'low',
        userMessage: 'An unknown error occurred',
        isRetryable: false
      };
    }

    // Network-related errors
    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      return {
        type: 'timeout',
        severity: 'medium',
        userMessage: 'Request timed out. Please check your connection and try again.',
        isRetryable: true
      };
    }

    if (error.code === 'NETWORK_ERROR' || (error.message && error.message.includes('Network Error'))) {
      return {
        type: 'network',
        severity: 'medium',
        userMessage: 'Network error. Please check your internet connection.',
        isRetryable: true
      };
    }

    if (error.response) {
      const status = error.response.status;
      
      if (status >= 500) {
        return {
          type: 'server',
          severity: 'high',
          userMessage: 'Server error. Please try again later.',
          isRetryable: true
        };
      }
      
      if (status === 404) {
        return {
          type: 'not_found',
          severity: 'medium',
          userMessage: 'Data not found. Please refresh and try again.',
          isRetryable: false
        };
      }
      
      if (status === 403) {
        return {
          type: 'forbidden',
          severity: 'high',
          userMessage: 'Access denied. Please check your permissions.',
          isRetryable: false
        };
      }
      
      if (status >= 400) {
        return {
          type: 'client',
          severity: 'medium',
          userMessage: 'Invalid request. Please try again.',
          isRetryable: false
        };
      }
    }

    // Custom error types
    if (error instanceof NetworkError) {
      return {
        type: 'network',
        severity: 'medium',
        userMessage: error.message,
        isRetryable: error.isRetryable
      };
    }

    if (error instanceof ValidationError) {
      return {
        type: 'validation',
        severity: 'low',
        userMessage: 'Data validation failed. Please refresh and try again.',
        isRetryable: error.isRetryable,
        details: error.validationErrors
      };
    }

    if (error instanceof CacheError) {
      return {
        type: 'cache',
        severity: 'low',
        userMessage: 'Storage error. The app will continue with limited functionality.',
        isRetryable: error.isRetryable
      };
    }

    if (error instanceof DataSyncError) {
      return {
        type: 'sync',
        severity: 'medium',
        userMessage: 'Data synchronization failed. Using cached data.',
        isRetryable: error.isRetryable,
        attempts: error.syncAttempts
      };
    }

    // Generic error
    return {
      type: 'generic',
      severity: 'medium',
      userMessage: error.message || 'An unexpected error occurred',
      isRetryable: false
    };
  }

  static createUserFriendlyMessage(error, context = '') {
    const classification = this.classify(error);
    let message = classification.userMessage;
    
    if (context) {
      message = `${context}: ${message}`;
    }
    
    if (classification.isRetryable) {
      message += ' You can try again.';
    }
    
    return {
      message,
      type: classification.type,
      severity: classification.severity,
      isRetryable: classification.isRetryable,
      details: classification.details
    };
  }

  static shouldRetry(error, attemptCount = 0, maxAttempts = 3) {
    if (attemptCount >= maxAttempts) {
      return false;
    }

    const classification = ErrorHandler.classify(error);
    return classification.isRetryable;
  }

  static getRetryDelay(attemptCount, baseDelay = 1000) {
    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, attemptCount);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, 30000); // Max 30 seconds
  }

  static logError(error, context = '', additionalData = {}) {
    const classification = this.classify(error);
    const logData = {
      timestamp: new Date().toISOString(),
      context,
      type: classification.type,
      severity: classification.severity,
      message: error.message,
      stack: error.stack,
      ...additionalData
    };

    // In development, log to console
    if (__DEV__) {
      console.group(`🚨 Error [${classification.severity.toUpperCase()}]: ${classification.type}`);
      console.error('Message:', error.message);
      console.error('Context:', context);
      console.error('Classification:', classification);
      console.error('Additional Data:', additionalData);
      console.error('Stack:', error.stack);
      console.groupEnd();
    }

    // In production, you might want to send to a logging service
    // Example: LoggingService.log(logData);

    return logData;
  }
}

/**
 * Retry utility with exponential backoff
 */
export class RetryHandler {
  static async withRetry(
    operation,
    options = {}
  ) {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      shouldRetry = ErrorHandler.shouldRetry,
      onRetry = null
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts - 1 || !shouldRetry(error, attempt, maxAttempts)) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelay
        );

        if (onRetry) {
          onRetry(error, attempt + 1, delay);
        }

        ErrorHandler.logError(error, `Retry attempt ${attempt + 1}/${maxAttempts}`, {
          nextRetryIn: delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Error boundary utility for React components
 * Note: This requires React to be imported in the consuming component
 */
export const createErrorBoundary = (fallbackComponent) => {
  const React = require('react');
  return class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      ErrorHandler.logError(error, 'React Error Boundary', {
        componentStack: errorInfo.componentStack
      });
    }

    render() {
      if (this.state.hasError) {
        return fallbackComponent ? 
          fallbackComponent(this.state.error) : 
          React.createElement('div', {}, 'Something went wrong.');
      }

      return this.props.children;
    }
  };
};

/**
 * Safe async operation wrapper
 */
export const safeAsync = async (operation, fallbackValue = null, context = '') => {
  try {
    return await operation();
  } catch (error) {
    ErrorHandler.logError(error, context);
    return fallbackValue;
  }
};

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(operation, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        if (fallback) {
          return await fallback();
        }
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
}

/**
 * Promise timeout wrapper
 */
export const withTimeout = (promise, timeoutMs = 30000, timeoutMessage = 'Operation timed out') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
};

/**
 * Graceful degradation helper
 */
export const gracefulDegradation = async (primaryOperation, fallbackOperation, context = '') => {
  try {
    return await primaryOperation();
  } catch (error) {
    ErrorHandler.logError(error, `${context} - falling back to alternative`);
    
    try {
      return await fallbackOperation();
    } catch (fallbackError) {
      ErrorHandler.logError(fallbackError, `${context} - fallback also failed`);
      throw fallbackError;
    }
  }
};

/**
 * Error aggregation for multiple operations
 */
export class ErrorAggregator {
  constructor() {
    this.errors = [];
  }

  add(error, context = '') {
    this.errors.push({
      error,
      context,
      timestamp: Date.now(),
      classification: ErrorHandler.classify(error)
    });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  getErrors() {
    return this.errors;
  }

  getCriticalErrors() {
    return this.errors.filter(e => e.classification.severity === 'high');
  }

  getRetryableErrors() {
    return this.errors.filter(e => e.classification.isRetryable);
  }

  getSummary() {
    const total = this.errors.length;
    const critical = this.getCriticalErrors().length;
    const retryable = this.getRetryableErrors().length;
    
    return {
      total,
      critical,
      retryable,
      types: [...new Set(this.errors.map(e => e.classification.type))]
    };
  }

  clear() {
    this.errors = [];
  }
}
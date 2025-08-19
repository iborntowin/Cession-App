/**
 * Enhanced error handling utility for frontend applications
 * Provides comprehensive error handling, logging, and user feedback
 */

import { showAlert } from '$lib/stores';
import { t } from '$lib/i18n';

/**
 * Error types for categorization
 */
export const ErrorTypes = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NETWORK: 'network',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Enhanced error class with additional context
 */
export class AppError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, severity = ErrorSeverity.MEDIUM, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  }
}

/**
 * Error logger for debugging and monitoring
 */
class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Keep last 100 errors in memory
  }

  log(error, context = {}) {
    const errorEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      message: error.message,
      type: error.type || ErrorTypes.UNKNOWN,
      severity: error.severity || ErrorSeverity.MEDIUM,
      stack: error.stack,
      details: error.details || {},
      context,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };

    this.errors.unshift(errorEntry);
    
    // Keep only the latest errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console based on severity
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🔴 CRITICAL ERROR:', errorEntry);
        break;
      case ErrorSeverity.HIGH:
        console.error('🟠 HIGH ERROR:', errorEntry);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('🟡 MEDIUM ERROR:', errorEntry);
        break;
      default:
        console.log('🔵 LOW ERROR:', errorEntry);
    }

    // Send to monitoring service in production
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      this.sendToMonitoring(errorEntry);
    }
  }

  async sendToMonitoring(errorEntry) {
    try {
      // In a real application, send to monitoring service like Sentry, LogRocket, etc.
      // For now, we'll just log it
      console.log('📊 Sending error to monitoring service:', errorEntry.id);
    } catch (e) {
      console.error('Failed to send error to monitoring service:', e);
    }
  }

  getErrors(type = null, severity = null) {
    let filtered = this.errors;
    
    if (type) {
      filtered = filtered.filter(error => error.type === type);
    }
    
    if (severity) {
      filtered = filtered.filter(error => error.severity === severity);
    }
    
    return filtered;
  }

  clearErrors() {
    this.errors = [];
  }
}

// Global error logger instance
export const errorLogger = new ErrorLogger();

/**
 * Handles API errors with proper categorization and user feedback
 */
export function handleApiError(error, context = {}) {
  let appError;
  let userMessage = 'An unexpected error occurred. Please try again.';

  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        appError = new AppError(
          data.message || 'Invalid request data',
          ErrorTypes.VALIDATION,
          ErrorSeverity.MEDIUM,
          { status, data, context }
        );
        userMessage = data.message || 'Please check your input and try again.';
        break;

      case 401:
        appError = new AppError(
          'Authentication failed',
          ErrorTypes.AUTHENTICATION,
          ErrorSeverity.HIGH,
          { status, data, context }
        );
        userMessage = 'Your session has expired. Please log in again.';
        // Redirect to login if needed
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
        break;

      case 403:
        appError = new AppError(
          'Access denied',
          ErrorTypes.AUTHORIZATION,
          ErrorSeverity.HIGH,
          { status, data, context }
        );
        userMessage = 'You do not have permission to perform this action.';
        break;

      case 404:
        appError = new AppError(
          'Resource not found',
          ErrorTypes.CLIENT,
          ErrorSeverity.MEDIUM,
          { status, data, context }
        );
        userMessage = 'The requested resource was not found.';
        break;

      case 422:
        appError = new AppError(
          'Validation failed',
          ErrorTypes.VALIDATION,
          ErrorSeverity.MEDIUM,
          { status, data, context }
        );
        userMessage = data.message || 'Please check your input and try again.';
        break;

      case 429:
        appError = new AppError(
          'Rate limit exceeded',
          ErrorTypes.CLIENT,
          ErrorSeverity.MEDIUM,
          { status, data, context }
        );
        userMessage = 'Too many requests. Please wait a moment and try again.';
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        appError = new AppError(
          'Server error',
          ErrorTypes.SERVER,
          ErrorSeverity.HIGH,
          { status, data, context }
        );
        userMessage = 'Server is temporarily unavailable. Please try again later.';
        break;

      default:
        appError = new AppError(
          `HTTP ${status}: ${data.message || error.message}`,
          ErrorTypes.SERVER,
          ErrorSeverity.MEDIUM,
          { status, data, context }
        );
    }
  } else if (error.request) {
    // Network error (no response received)
    appError = new AppError(
      'Network connection failed',
      ErrorTypes.NETWORK,
      ErrorSeverity.HIGH,
      { error: error.message, context }
    );
    userMessage = 'Unable to connect to the server. Please check your internet connection.';
  } else {
    // Client-side error
    appError = new AppError(
      error.message || 'Unknown client error',
      ErrorTypes.CLIENT,
      ErrorSeverity.MEDIUM,
      { error: error.message, context }
    );
  }

  // Log the error
  errorLogger.log(appError, context);

  // Show user-friendly message
  showAlert(userMessage, 'error');

  return appError;
}

/**
 * Handles form validation errors
 */
export function handleValidationErrors(errors, formName = 'form') {
  const validationError = new AppError(
    `Validation failed for ${formName}`,
    ErrorTypes.VALIDATION,
    ErrorSeverity.LOW,
    { errors, formName }
  );

  errorLogger.log(validationError);

  // Show specific field errors if available
  if (typeof errors === 'object' && errors !== null) {
    const errorMessages = Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(', ');
    showAlert(`Please fix the following errors: ${errorMessages}`, 'error');
  } else {
    showAlert('Please check your input and try again.', 'error');
  }

  return validationError;
}

/**
 * Global error handler for uncaught errors
 */
export function setupGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      const error = new AppError(
        event.error?.message || event.message || 'Uncaught error',
        ErrorTypes.CLIENT,
        ErrorSeverity.HIGH,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      );
      
      errorLogger.log(error, { type: 'uncaught' });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = new AppError(
        event.reason?.message || 'Unhandled promise rejection',
        ErrorTypes.CLIENT,
        ErrorSeverity.HIGH,
        {
          reason: event.reason,
          promise: event.promise
        }
      );
      
      errorLogger.log(error, { type: 'unhandled-promise' });
      
      // Prevent the default console error
      event.preventDefault();
    });
  }
}

/**
 * Retry mechanism for failed operations
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      const retryError = new AppError(
        `Operation failed on attempt ${attempt}/${maxRetries}`,
        ErrorTypes.CLIENT,
        ErrorSeverity.LOW,
        { attempt, maxRetries, originalError: error.message }
      );
      
      errorLogger.log(retryError);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  // All retries failed
  const finalError = new AppError(
    `Operation failed after ${maxRetries} attempts`,
    ErrorTypes.CLIENT,
    ErrorSeverity.HIGH,
    { maxRetries, lastError: lastError.message }
  );
  
  errorLogger.log(finalError);
  throw finalError;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new AppError(
          'Circuit breaker is OPEN',
          ErrorTypes.CLIENT,
          ErrorSeverity.HIGH,
          { state: this.state, failureCount: this.failureCount }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
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
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Memory usage monitoring
 */
export function monitorMemoryUsage() {
  if (typeof performance !== 'undefined' && performance.memory) {
    const memoryInfo = {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576),
      total: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
    };

    // Alert if memory usage is too high
    if (memoryInfo.used > 200) {
      const memoryError = new AppError(
        'High memory usage detected',
        ErrorTypes.CLIENT,
        ErrorSeverity.HIGH,
        memoryInfo
      );
      
      errorLogger.log(memoryError);
    }

    return memoryInfo;
  }
  
  return null;
}

/**
 * Performance monitoring
 */
export function measurePerformance(name, operation) {
  return async (...args) => {
    const startTime = performance.now();
    
    try {
      const result = await operation(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log slow operations
      if (duration > 1000) {
        const perfError = new AppError(
          `Slow operation detected: ${name}`,
          ErrorTypes.CLIENT,
          ErrorSeverity.MEDIUM,
          { name, duration, args }
        );
        
        errorLogger.log(perfError);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const perfError = new AppError(
        `Operation failed: ${name}`,
        ErrorTypes.CLIENT,
        ErrorSeverity.HIGH,
        { name, duration, args, error: error.message }
      );
      
      errorLogger.log(perfError);
      throw error;
    }
  };
}

// Initialize global error handling
if (typeof window !== 'undefined') {
  setupGlobalErrorHandler();
  
  // Monitor memory usage every 30 seconds
  setInterval(monitorMemoryUsage, 30000);
}

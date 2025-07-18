import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorHandler } from './errorHandling';

/**
 * Comprehensive logging service for mobile app
 */
class LoggingService {
  constructor() {
    this.logQueue = [];
    this.maxQueueSize = 100;
    this.maxStorageSize = 500; // Maximum logs to store
    this.isInitialized = false;
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLogLevel = __DEV__ ? this.logLevels.DEBUG : this.logLevels.INFO;
  }

  /**
   * Initialize the logging service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load existing logs from storage
      await this.loadLogsFromStorage();
      this.isInitialized = true;
      
      this.info('LoggingService initialized', { 
        queueSize: this.logQueue.length,
        logLevel: this.getCurrentLogLevelName()
      });
    } catch (error) {
      console.error('Failed to initialize logging service:', error);
    }
  }

  /**
   * Set log level
   */
  setLogLevel(level) {
    if (typeof level === 'string') {
      this.currentLogLevel = this.logLevels[level.toUpperCase()] ?? this.logLevels.INFO;
    } else {
      this.currentLogLevel = level;
    }
  }

  /**
   * Get current log level name
   */
  getCurrentLogLevelName() {
    return Object.keys(this.logLevels).find(
      key => this.logLevels[key] === this.currentLogLevel
    ) || 'INFO';
  }

  /**
   * Check if log level should be logged
   */
  shouldLog(level) {
    return level <= this.currentLogLevel;
  }

  /**
   * Create a log entry
   */
  createLogEntry(level, message, data = {}, error = null) {
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      level: this.getLevelName(level),
      message,
      data: this.sanitizeData(data),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      source: 'mobile-app'
    };
  }

  /**
   * Get level name from number
   */
  getLevelName(level) {
    return Object.keys(this.logLevels).find(
      key => this.logLevels[key] === level
    ) || 'INFO';
  }

  /**
   * Sanitize data to prevent circular references and large objects
   */
  sanitizeData(data) {
    try {
      // Convert to JSON and back to remove circular references
      const jsonString = JSON.stringify(data, (key, value) => {
        // Limit string length
        if (typeof value === 'string' && value.length > 1000) {
          return value.substring(0, 1000) + '... [truncated]';
        }
        
        // Skip functions
        if (typeof value === 'function') {
          return '[Function]';
        }
        
        return value;
      });
      
      // Limit overall size
      if (jsonString.length > 5000) {
        return { 
          _truncated: true, 
          _originalSize: jsonString.length,
          _data: jsonString.substring(0, 5000) + '... [truncated]'
        };
      }
      
      return JSON.parse(jsonString);
    } catch (error) {
      return { _error: 'Failed to sanitize data', _original: String(data) };
    }
  }

  /**
   * Add log to queue and manage size
   */
  addToQueue(logEntry) {
    this.logQueue.push(logEntry);
    
    // Maintain queue size
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue.shift();
    }
    
    // Persist to storage periodically
    if (this.logQueue.length % 10 === 0) {
      this.persistLogsToStorage().catch(error => {
        console.error('Failed to persist logs:', error);
      });
    }
  }

  /**
   * Log error
   */
  error(message, data = {}, error = null) {
    if (!this.shouldLog(this.logLevels.ERROR)) return;
    
    const logEntry = this.createLogEntry(this.logLevels.ERROR, message, data, error);
    this.addToQueue(logEntry);
    
    // Always log errors to console
    console.error(`[${logEntry.timestamp}] ERROR: ${message}`, data, error);
  }

  /**
   * Log warning
   */
  warn(message, data = {}) {
    if (!this.shouldLog(this.logLevels.WARN)) return;
    
    const logEntry = this.createLogEntry(this.logLevels.WARN, message, data);
    this.addToQueue(logEntry);
    
    if (__DEV__) {
      console.warn(`[${logEntry.timestamp}] WARN: ${message}`, data);
    }
  }

  /**
   * Log info
   */
  info(message, data = {}) {
    if (!this.shouldLog(this.logLevels.INFO)) return;
    
    const logEntry = this.createLogEntry(this.logLevels.INFO, message, data);
    this.addToQueue(logEntry);
    
    if (__DEV__) {
      console.info(`[${logEntry.timestamp}] INFO: ${message}`, data);
    }
  }

  /**
   * Log debug
   */
  debug(message, data = {}) {
    if (!this.shouldLog(this.logLevels.DEBUG)) return;
    
    const logEntry = this.createLogEntry(this.logLevels.DEBUG, message, data);
    this.addToQueue(logEntry);
    
    if (__DEV__) {
      console.debug(`[${logEntry.timestamp}] DEBUG: ${message}`, data);
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation, durationMs, data = {}) {
    this.info(`Performance: ${operation}`, {
      ...data,
      durationMs,
      operation
    });
  }

  /**
   * Log user action
   */
  userAction(action, data = {}) {
    this.info(`User Action: ${action}`, {
      ...data,
      action,
      type: 'user_action'
    });
  }

  /**
   * Log network request
   */
  networkRequest(method, url, status, durationMs, data = {}) {
    const level = status >= 400 ? this.logLevels.ERROR : this.logLevels.INFO;
    const message = `Network: ${method} ${url} - ${status}`;
    
    const logEntry = this.createLogEntry(level, message, {
      ...data,
      method,
      url,
      status,
      durationMs,
      type: 'network_request'
    });
    
    this.addToQueue(logEntry);
    
    if (__DEV__ || status >= 400) {
      console.log(`[${logEntry.timestamp}] ${message}`, data);
    }
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level) {
    const levelName = typeof level === 'string' ? level.toUpperCase() : this.getLevelName(level);
    return this.logQueue.filter(log => log.level === levelName);
  }

  /**
   * Get logs by time range
   */
  getLogsByTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return this.logQueue.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= start && logTime <= end;
    });
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50) {
    return this.logQueue.slice(-count);
  }

  /**
   * Search logs
   */
  searchLogs(query) {
    const lowerQuery = query.toLowerCase();
    return this.logQueue.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(log.data).toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get log statistics
   */
  getLogStats() {
    const stats = {
      total: this.logQueue.length,
      byLevel: {},
      byHour: {},
      recentErrors: 0
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    this.logQueue.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count recent errors
      if (log.level === 'ERROR' && new Date(log.timestamp) > oneHourAgo) {
        stats.recentErrors++;
      }
      
      // Count by hour
      const hour = new Date(log.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return {
      exportTime: new Date().toISOString(),
      logLevel: this.getCurrentLogLevelName(),
      stats: this.getLogStats(),
      logs: this.logQueue
    };
  }

  /**
   * Clear all logs
   */
  async clearLogs() {
    this.logQueue = [];
    try {
      await AsyncStorage.removeItem('app_logs');
      this.info('Logs cleared');
    } catch (error) {
      this.error('Failed to clear logs from storage', {}, error);
    }
  }

  /**
   * Persist logs to AsyncStorage
   */
  async persistLogsToStorage() {
    try {
      // Only store the most recent logs to manage storage size
      const logsToStore = this.logQueue.slice(-this.maxStorageSize);
      await AsyncStorage.setItem('app_logs', JSON.stringify(logsToStore));
    } catch (error) {
      console.error('Failed to persist logs to storage:', error);
    }
  }

  /**
   * Load logs from AsyncStorage
   */
  async loadLogsFromStorage() {
    try {
      const storedLogs = await AsyncStorage.getItem('app_logs');
      if (storedLogs) {
        const logs = JSON.parse(storedLogs);
        if (Array.isArray(logs)) {
          this.logQueue = logs;
        }
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }

  /**
   * Create a logger instance with context
   */
  createLogger(context) {
    return {
      error: (message, data = {}, error = null) => 
        this.error(message, { ...data, context }, error),
      warn: (message, data = {}) => 
        this.warn(message, { ...data, context }),
      info: (message, data = {}) => 
        this.info(message, { ...data, context }),
      debug: (message, data = {}) => 
        this.debug(message, { ...data, context }),
      performance: (operation, durationMs, data = {}) => 
        this.performance(operation, durationMs, { ...data, context }),
      userAction: (action, data = {}) => 
        this.userAction(action, { ...data, context })
    };
  }
}

// Create singleton instance
const loggingService = new LoggingService();

export default loggingService;

/**
 * Initialize logging service
 */
export const initializeLogging = async () => {
  await loggingService.initialize();
};

/**
 * Get a logger with context
 */
export const getLogger = (context) => {
  return loggingService.createLogger(context);
};
package com.example.cessionappbackend.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/**
 * Centralized error logging utility with structured logging support
 */
public class ErrorLogger {
    
    private static final Logger logger = LoggerFactory.getLogger(ErrorLogger.class);
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    
    /**
     * Log an error with context information
     */
    public static void logError(String operation, Throwable error, Map<String, Object> context) {
        String correlationId = generateCorrelationId();
        
        try {
            // Set MDC for structured logging
            MDC.put("correlationId", correlationId);
            MDC.put("operation", operation);
            MDC.put("timestamp", LocalDateTime.now().format(TIMESTAMP_FORMAT));
            
            if (context != null) {
                context.forEach((key, value) -> {
                    if (value != null) {
                        MDC.put(key, value.toString());
                    }
                });
            }
            
            // Log the error with full context
            logger.error("Operation '{}' failed [correlationId={}]: {}", 
                        operation, correlationId, error.getMessage(), error);
            
            // Log additional context if available
            if (context != null && !context.isEmpty()) {
                logger.error("Error context [correlationId={}]: {}", correlationId, context);
            }
            
        } finally {
            // Clean up MDC
            MDC.clear();
        }
    }
    
    /**
     * Log an error with simple message
     */
    public static void logError(String operation, Throwable error) {
        logError(operation, error, null);
    }
    
    /**
     * Log a warning with context
     */
    public static void logWarning(String operation, String message, Map<String, Object> context) {
        String correlationId = generateCorrelationId();
        
        try {
            MDC.put("correlationId", correlationId);
            MDC.put("operation", operation);
            MDC.put("timestamp", LocalDateTime.now().format(TIMESTAMP_FORMAT));
            
            if (context != null) {
                context.forEach((key, value) -> {
                    if (value != null) {
                        MDC.put(key, value.toString());
                    }
                });
            }
            
            logger.warn("Operation '{}' warning [correlationId={}]: {}", operation, correlationId, message);
            
            if (context != null && !context.isEmpty()) {
                logger.warn("Warning context [correlationId={}]: {}", correlationId, context);
            }
            
        } finally {
            MDC.clear();
        }
    }
    
    /**
     * Log successful operation with metrics
     */
    public static void logSuccess(String operation, Map<String, Object> metrics) {
        String correlationId = generateCorrelationId();
        
        try {
            MDC.put("correlationId", correlationId);
            MDC.put("operation", operation);
            MDC.put("timestamp", LocalDateTime.now().format(TIMESTAMP_FORMAT));
            
            if (metrics != null) {
                metrics.forEach((key, value) -> {
                    if (value != null) {
                        MDC.put(key, value.toString());
                    }
                });
            }
            
            logger.info("Operation '{}' completed successfully [correlationId={}]", operation, correlationId);
            
            if (metrics != null && !metrics.isEmpty()) {
                logger.info("Operation metrics [correlationId={}]: {}", correlationId, metrics);
            }
            
        } finally {
            MDC.clear();
        }
    }
    
    /**
     * Log retry attempt
     */
    public static void logRetryAttempt(String operation, int attemptNumber, int maxAttempts, 
                                     Throwable lastError, long delayMs) {
        String correlationId = generateCorrelationId();
        
        try {
            MDC.put("correlationId", correlationId);
            MDC.put("operation", operation);
            MDC.put("attemptNumber", String.valueOf(attemptNumber));
            MDC.put("maxAttempts", String.valueOf(maxAttempts));
            MDC.put("delayMs", String.valueOf(delayMs));
            
            logger.warn("Retrying operation '{}' [correlationId={}]: attempt {}/{} after {}ms delay. Last error: {}", 
                       operation, correlationId, attemptNumber, maxAttempts, delayMs, 
                       lastError != null ? lastError.getMessage() : "Unknown");
            
        } finally {
            MDC.clear();
        }
    }
    
    /**
     * Log performance metrics
     */
    public static void logPerformance(String operation, long durationMs, Map<String, Object> metrics) {
        String correlationId = generateCorrelationId();
        
        try {
            MDC.put("correlationId", correlationId);
            MDC.put("operation", operation);
            MDC.put("durationMs", String.valueOf(durationMs));
            
            if (metrics != null) {
                metrics.forEach((key, value) -> {
                    if (value != null) {
                        MDC.put(key, value.toString());
                    }
                });
            }
            
            logger.info("Performance metrics for '{}' [correlationId={}]: {}ms", 
                       operation, correlationId, durationMs);
            
            if (metrics != null && !metrics.isEmpty()) {
                logger.info("Additional metrics [correlationId={}]: {}", correlationId, metrics);
            }
            
        } finally {
            MDC.clear();
        }
    }
    
    /**
     * Generate a unique correlation ID for tracking related log entries
     */
    private static String generateCorrelationId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
    
    /**
     * Helper class for building context maps
     */
    public static class ContextBuilder {
        private final Map<String, Object> context = new java.util.HashMap<>();
        
        public ContextBuilder add(String key, Object value) {
            if (value != null) {
                context.put(key, value);
            }
            return this;
        }
        
        public ContextBuilder addIfNotNull(String key, Object value) {
            if (value != null) {
                context.put(key, value);
            }
            return this;
        }
        
        public Map<String, Object> build() {
            return new java.util.HashMap<>(context);
        }
    }
    
    /**
     * Create a new context builder
     */
    public static ContextBuilder context() {
        return new ContextBuilder();
    }
}
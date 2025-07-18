package com.example.cessionappbackend.utils;

import com.example.cessionappbackend.exceptions.ExportException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.Callable;
import java.util.function.Predicate;

/**
 * Utility class for handling retry logic with exponential backoff
 */
public class RetryHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(RetryHandler.class);
    
    /**
     * Execute an operation with retry logic
     */
    public static <T> T executeWithRetry(
            String operationName,
            Callable<T> operation,
            int maxAttempts,
            long baseDelayMs,
            Predicate<Exception> shouldRetry) throws Exception {
        
        Exception lastException = null;
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                long startTime = System.currentTimeMillis();
                T result = operation.call();
                long duration = System.currentTimeMillis() - startTime;
                
                if (attempt > 1) {
                    ErrorLogger.logSuccess(operationName, 
                        ErrorLogger.context()
                            .add("attemptNumber", attempt)
                            .add("durationMs", duration)
                            .add("retriedAfterFailures", attempt - 1)
                            .build());
                }
                
                return result;
                
            } catch (Exception e) {
                lastException = e;
                
                // Check if we should retry
                if (attempt >= maxAttempts || !shouldRetry.test(e)) {
                    break;
                }
                
                // Calculate delay with exponential backoff and jitter
                long delay = calculateDelay(baseDelayMs, attempt);
                
                ErrorLogger.logRetryAttempt(operationName, attempt, maxAttempts, e, delay);
                
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new ExportException("Operation interrupted during retry", ie, "INTERRUPTED", false);
                }
            }
        }
        
        // All attempts failed
        ErrorLogger.logError(operationName, lastException, 
            ErrorLogger.context()
                .add("maxAttempts", maxAttempts)
                .add("finalAttempt", maxAttempts)
                .add("allAttemptsFailed", true)
                .build());
        
        throw lastException;
    }
    
    /**
     * Execute with default retry settings for export operations
     */
    public static <T> T executeExportWithRetry(String operationName, Callable<T> operation) throws Exception {
        return executeWithRetry(
            operationName,
            operation,
            3, // max attempts
            1000, // base delay 1 second
            RetryHandler::isRetryableException
        );
    }
    
    /**
     * Execute with network-specific retry settings
     */
    public static <T> T executeNetworkWithRetry(String operationName, Callable<T> operation) throws Exception {
        return executeWithRetry(
            operationName,
            operation,
            5, // max attempts for network operations
            2000, // base delay 2 seconds
            RetryHandler::isNetworkRetryableException
        );
    }
    
    /**
     * Calculate delay with exponential backoff and jitter
     */
    private static long calculateDelay(long baseDelayMs, int attemptNumber) {
        // Exponential backoff: baseDelay * 2^(attempt-1)
        long exponentialDelay = baseDelayMs * (long) Math.pow(2, attemptNumber - 1);
        
        // Add jitter (random factor between 0.5 and 1.5)
        double jitterFactor = 0.5 + Math.random();
        long delayWithJitter = (long) (exponentialDelay * jitterFactor);
        
        // Cap at maximum delay of 30 seconds
        return Math.min(delayWithJitter, 30000);
    }
    
    /**
     * Determine if an exception is retryable for general export operations
     */
    public static boolean isRetryableException(Exception e) {
        if (e instanceof ExportException) {
            return ((ExportException) e).isRetryable();
        }
        
        // Network-related exceptions are generally retryable
        if (isNetworkException(e)) {
            return true;
        }
        
        // Timeout exceptions are retryable
        if (isTimeoutException(e)) {
            return true;
        }
        
        // Server errors (5xx) are retryable
        if (isServerErrorException(e)) {
            return true;
        }
        
        // Default to not retryable for unknown exceptions
        return false;
    }
    
    /**
     * Determine if an exception is retryable for network operations
     */
    public static boolean isNetworkRetryableException(Exception e) {
        // More lenient retry policy for network operations
        if (isRetryableException(e)) {
            return true;
        }
        
        // Additional network-specific retryable conditions
        String message = e.getMessage();
        if (message != null) {
            String lowerMessage = message.toLowerCase();
            return lowerMessage.contains("connection reset") ||
                   lowerMessage.contains("connection refused") ||
                   lowerMessage.contains("no route to host") ||
                   lowerMessage.contains("network is unreachable");
        }
        
        return false;
    }
    
    /**
     * Check if exception is network-related
     */
    private static boolean isNetworkException(Exception e) {
        String className = e.getClass().getSimpleName().toLowerCase();
        String message = e.getMessage();
        
        return className.contains("network") ||
               className.contains("connection") ||
               className.contains("socket") ||
               (message != null && (
                   message.toLowerCase().contains("network") ||
                   message.toLowerCase().contains("connection") ||
                   message.toLowerCase().contains("socket")
               ));
    }
    
    /**
     * Check if exception is timeout-related
     */
    private static boolean isTimeoutException(Exception e) {
        String className = e.getClass().getSimpleName().toLowerCase();
        String message = e.getMessage();
        
        return className.contains("timeout") ||
               (message != null && message.toLowerCase().contains("timeout"));
    }
    
    /**
     * Check if exception is a server error (5xx)
     */
    private static boolean isServerErrorException(Exception e) {
        String message = e.getMessage();
        if (message != null) {
            // Look for HTTP 5xx status codes
            return message.contains("500") || message.contains("502") || 
                   message.contains("503") || message.contains("504") ||
                   message.toLowerCase().contains("server error") ||
                   message.toLowerCase().contains("internal server error");
        }
        return false;
    }
    
    /**
     * Builder class for custom retry configurations
     */
    public static class RetryConfig {
        private int maxAttempts = 3;
        private long baseDelayMs = 1000;
        private Predicate<Exception> shouldRetry = RetryHandler::isRetryableException;
        
        public RetryConfig maxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
            return this;
        }
        
        public RetryConfig baseDelay(long baseDelayMs) {
            this.baseDelayMs = baseDelayMs;
            return this;
        }
        
        public RetryConfig shouldRetry(Predicate<Exception> shouldRetry) {
            this.shouldRetry = shouldRetry;
            return this;
        }
        
        public <T> T execute(String operationName, Callable<T> operation) throws Exception {
            return executeWithRetry(operationName, operation, maxAttempts, baseDelayMs, shouldRetry);
        }
    }
    
    /**
     * Create a new retry configuration builder
     */
    public static RetryConfig config() {
        return new RetryConfig();
    }
}
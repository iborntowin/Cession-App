package com.example.cessionappbackend.exceptions;

/**
 * Custom exception for export-related errors
 */
public class ExportException extends RuntimeException {
    
    private final String errorCode;
    private final boolean isRetryable;
    private final int attemptCount;
    
    public ExportException(String message) {
        super(message);
        this.errorCode = "EXPORT_ERROR";
        this.isRetryable = false;
        this.attemptCount = 0;
    }
    
    public ExportException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "EXPORT_ERROR";
        this.isRetryable = false;
        this.attemptCount = 0;
    }
    
    public ExportException(String message, String errorCode, boolean isRetryable) {
        super(message);
        this.errorCode = errorCode;
        this.isRetryable = isRetryable;
        this.attemptCount = 0;
    }
    
    public ExportException(String message, String errorCode, boolean isRetryable, int attemptCount) {
        super(message);
        this.errorCode = errorCode;
        this.isRetryable = isRetryable;
        this.attemptCount = attemptCount;
    }
    
    public ExportException(String message, Throwable cause, String errorCode, boolean isRetryable) {
        super(message, cause);
        this.errorCode = errorCode;
        this.isRetryable = isRetryable;
        this.attemptCount = 0;
    }
    
    public ExportException(String message, Throwable cause, String errorCode, boolean isRetryable, int attemptCount) {
        super(message, cause);
        this.errorCode = errorCode;
        this.isRetryable = isRetryable;
        this.attemptCount = attemptCount;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    public boolean isRetryable() {
        return isRetryable;
    }
    
    public int getAttemptCount() {
        return attemptCount;
    }
    
    /**
     * Create a new ExportException with incremented attempt count
     */
    public ExportException withIncrementedAttempt() {
        return new ExportException(getMessage(), getCause(), errorCode, isRetryable, attemptCount + 1);
    }
    
    /**
     * Static factory methods for common error scenarios
     */
    public static ExportException dataGenerationFailed(String message, Throwable cause) {
        return new ExportException(message, cause, "DATA_GENERATION_FAILED", false);
    }
    
    public static ExportException uploadFailed(String message, Throwable cause, boolean isRetryable) {
        return new ExportException(message, cause, "UPLOAD_FAILED", isRetryable);
    }
    
    public static ExportException configurationError(String message) {
        return new ExportException(message, "CONFIGURATION_ERROR", false);
    }
    
    public static ExportException networkError(String message, Throwable cause) {
        return new ExportException(message, cause, "NETWORK_ERROR", true);
    }
    
    public static ExportException timeoutError(String message) {
        return new ExportException(message, "TIMEOUT_ERROR", true);
    }
    
    public static ExportException validationError(String message) {
        return new ExportException(message, "VALIDATION_ERROR", false);
    }
}
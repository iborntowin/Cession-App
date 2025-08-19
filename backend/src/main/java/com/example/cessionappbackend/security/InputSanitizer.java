package com.example.cessionappbackend.security;

import org.springframework.stereotype.Component;
import java.util.regex.Pattern;

@Component
public class InputSanitizer {

    // Patterns for XSS detection
    private static final Pattern SCRIPT_PATTERN = Pattern.compile("<script[^>]*>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern SRC_PATTERN = Pattern.compile("src[\\r\\n]*=[\\r\\n]*\\\"(.*?)\\\"", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL);
    private static final Pattern EVAL_PATTERN = Pattern.compile("eval\\((.*)\\)", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL);
    private static final Pattern EXPRESSION_PATTERN = Pattern.compile("expression\\((.*)\\)", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL);
    private static final Pattern JAVASCRIPT_PATTERN = Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE);
    private static final Pattern VBSCRIPT_PATTERN = Pattern.compile("vbscript:", Pattern.CASE_INSENSITIVE);
    private static final Pattern ONLOAD_PATTERN = Pattern.compile("onload(.*?)=", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL);
    private static final Pattern ONERROR_PATTERN = Pattern.compile("onerror(.*?)=", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL);

    /**
     * Sanitize input to prevent XSS attacks
     */
    public String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }

        String sanitized = input;

        // Remove script tags
        sanitized = SCRIPT_PATTERN.matcher(sanitized).replaceAll("");

        // Remove src attributes with suspicious content
        sanitized = SRC_PATTERN.matcher(sanitized).replaceAll("");

        // Remove eval expressions
        sanitized = EVAL_PATTERN.matcher(sanitized).replaceAll("");

        // Remove expression attributes
        sanitized = EXPRESSION_PATTERN.matcher(sanitized).replaceAll("");

        // Remove javascript: URLs
        sanitized = JAVASCRIPT_PATTERN.matcher(sanitized).replaceAll("");

        // Remove vbscript: URLs
        sanitized = VBSCRIPT_PATTERN.matcher(sanitized).replaceAll("");

        // Remove onload attributes
        sanitized = ONLOAD_PATTERN.matcher(sanitized).replaceAll("");

        // Remove onerror attributes
        sanitized = ONERROR_PATTERN.matcher(sanitized).replaceAll("");

        // Encode remaining HTML entities
        sanitized = htmlEncode(sanitized);

        return sanitized;
    }

    /**
     * Validate that input doesn't contain XSS patterns
     */
    public void validateInput(String input, String fieldName) {
        if (input == null) {
            return;
        }

        if (SCRIPT_PATTERN.matcher(input).find()) {
            throw new IllegalArgumentException(fieldName + " contains invalid script content");
        }

        if (JAVASCRIPT_PATTERN.matcher(input).find()) {
            throw new IllegalArgumentException(fieldName + " contains invalid javascript content");
        }

        if (VBSCRIPT_PATTERN.matcher(input).find()) {
            throw new IllegalArgumentException(fieldName + " contains invalid vbscript content");
        }

        if (EVAL_PATTERN.matcher(input).find()) {
            throw new IllegalArgumentException(fieldName + " contains invalid eval expression");
        }

        if (EXPRESSION_PATTERN.matcher(input).find()) {
            throw new IllegalArgumentException(fieldName + " contains invalid CSS expression");
        }

        if (ONLOAD_PATTERN.matcher(input).find() || ONERROR_PATTERN.matcher(input).find()) {
            throw new IllegalArgumentException(fieldName + " contains invalid event handlers");
        }
    }

    /**
     * Sanitize SQL input to prevent SQL injection
     */
    public String sanitizeSqlInput(String input) {
        if (input == null) {
            return null;
        }

        // Remove common SQL injection patterns
        String sanitized = input
            .replaceAll("(?i)(union|select|insert|delete|update|drop|create|alter|exec|execute)", "")
            .replaceAll("(?i)(script|javascript|vbscript)", "")
            .replaceAll("[\\r\\n\\t]", " ")
            .replaceAll("\\s+", " ")
            .trim();

        // Remove SQL comment patterns
        sanitized = sanitized.replaceAll("--.*", "");
        sanitized = sanitized.replaceAll("/\\*.*?\\*/", "");

        return sanitized;
    }

    /**
     * Validate numeric input
     */
    public void validateNumericInput(String input, String fieldName, boolean required) {
        if (input == null || input.trim().isEmpty()) {
            if (required) {
                throw new IllegalArgumentException(fieldName + " is required");
            }
            return;
        }

        if (!input.matches("^\\d+$")) {
            throw new IllegalArgumentException(fieldName + " must contain only numbers");
        }
    }

    /**
     * Validate name input (letters, spaces, hyphens, apostrophes)
     */
    public void validateNameInput(String input, String fieldName, boolean required) {
        if (input == null || input.trim().isEmpty()) {
            if (required) {
                throw new IllegalArgumentException(fieldName + " is required");
            }
            return;
        }

        if (!input.matches("^[a-zA-ZÀ-ÿ\\s\\-']+$")) {
            throw new IllegalArgumentException(fieldName + " can only contain letters, spaces, hyphens, and apostrophes");
        }

        if (input.trim().length() < 2) {
            throw new IllegalArgumentException(fieldName + " must be at least 2 characters long");
        }

        if (input.trim().length() > 255) {
            throw new IllegalArgumentException(fieldName + " cannot exceed 255 characters");
        }
    }

    /**
     * Validate address input
     */
    public void validateAddressInput(String input, String fieldName, boolean required) {
        if (input == null || input.trim().isEmpty()) {
            if (required) {
                throw new IllegalArgumentException(fieldName + " is required");
            }
            return;
        }

        if (input.trim().length() < 5) {
            throw new IllegalArgumentException(fieldName + " must be at least 5 characters long");
        }

        if (input.trim().length() > 500) {
            throw new IllegalArgumentException(fieldName + " cannot exceed 500 characters");
        }

        // Check for XSS patterns
        validateInput(input, fieldName);
    }

    /**
     * Basic HTML encoding
     */
    private String htmlEncode(String input) {
        if (input == null) {
            return null;
        }

        return input
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")
            .replace("/", "&#x2F;");
    }

    /**
     * Sanitize for safe database storage
     */
    public String sanitizeForDatabase(String input) {
        if (input == null) {
            return null;
        }

        // First sanitize XSS
        String sanitized = sanitizeInput(input);
        
        // Then sanitize SQL
        sanitized = sanitizeSqlInput(sanitized);
        
        return sanitized.trim();
    }
}

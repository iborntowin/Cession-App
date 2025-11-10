package com.example.cessionappbackend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Data Transfer Object representing the loading progress of system components.
 * This DTO provides real-time status information about various system components
 * during application startup and health checks.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoadingProgressDTO {

    /**
     * Overall progress percentage (0-100)
     */
    @Min(value = 0, message = "Overall progress cannot be less than 0")
    @Max(value = 100, message = "Overall progress cannot be more than 100")
    private int overallProgress;

    /**
     * Map of component names to their individual progress information
     */
    @NotNull(message = "Components map cannot be null")
    private Map<String, ComponentProgress> components;

    /**
     * Current status message describing the loading state
     */
    @NotBlank(message = "Message cannot be blank")
    private String message;

    /**
     * Estimated time remaining in milliseconds
     */
    @Min(value = 0, message = "Estimated time remaining cannot be negative")
    private long estimatedTimeRemaining;

    /**
     * Timestamp when this progress was recorded
     */
    @NotNull(message = "Timestamp cannot be null")
    private LocalDateTime timestamp;

    /**
     * Inner class representing the progress of an individual component
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComponentProgress {

        /**
         * Progress percentage for this component (0-100)
         */
        @Min(value = 0, message = "Component progress cannot be less than 0")
        @Max(value = 100, message = "Component progress cannot be more than 100")
        private int progress;

        /**
         * Current status of this component
         */
        @NotNull(message = "Component status cannot be null")
        private ComponentStatus status;

        /**
         * Response time in milliseconds for the last operation
         */
        @Min(value = 0, message = "Response time cannot be negative")
        private long responseTime;
    }
}
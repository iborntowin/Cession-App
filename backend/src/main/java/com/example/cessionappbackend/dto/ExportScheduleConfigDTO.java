package com.example.cessionappbackend.dto;

import com.example.cessionappbackend.entities.ExportScheduleConfig;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

/**
 * DTO for export schedule configuration
 */
public class ExportScheduleConfigDTO {

    private Long id;
    private boolean enabled;
    private String cronExpression;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastRunTime;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime nextRunTime;
    
    private String lastRunStatus;
    private String lastErrorMessage;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
    
    private Long totalScheduledRuns;
    private Long successfulRuns;
    private Long failedRuns;

    // Human-readable schedule description
    private String scheduleDescription;

    public ExportScheduleConfigDTO() {
    }

    public ExportScheduleConfigDTO(ExportScheduleConfig config) {
        this.id = config.getId();
        this.enabled = config.isEnabled();
        this.cronExpression = config.getCronExpression();
        this.lastRunTime = config.getLastRunTime();
        this.nextRunTime = config.getNextRunTime();
        this.lastRunStatus = config.getLastRunStatus() != null ? config.getLastRunStatus().toString() : null;
        this.lastErrorMessage = config.getLastErrorMessage();
        this.createdAt = config.getCreatedAt();
        this.updatedAt = config.getUpdatedAt();
        this.totalScheduledRuns = config.getTotalScheduledRuns();
        this.successfulRuns = config.getSuccessfulRuns();
        this.failedRuns = config.getFailedRuns();
        this.scheduleDescription = generateScheduleDescription(config.getCronExpression());
    }

    private String generateScheduleDescription(String cronExpression) {
        // Simple description generator for common patterns
        if (cronExpression == null) return "Not configured";
        
        if (cronExpression.equals("0 0 10 * * SAT")) {
            return "Every Saturday at 10:00 AM";
        } else if (cronExpression.equals("0 0 10 * * SUN")) {
            return "Every Sunday at 10:00 AM";
        } else if (cronExpression.equals("0 0 10 * * MON-FRI")) {
            return "Every weekday at 10:00 AM";
        } else if (cronExpression.equals("0 0 10 * * *")) {
            return "Every day at 10:00 AM";
        } else if (cronExpression.matches("0 0 \\d+ \\* \\* \\*")) {
            String hour = cronExpression.split(" ")[2];
            return "Every day at " + hour + ":00";
        } else if (cronExpression.matches("0 0 \\d+ \\* \\* SAT")) {
            String hour = cronExpression.split(" ")[2];
            return "Every Saturday at " + hour + ":00";
        }
        
        return cronExpression; // Return raw expression if no match
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getCronExpression() {
        return cronExpression;
    }

    public void setCronExpression(String cronExpression) {
        this.cronExpression = cronExpression;
    }

    public LocalDateTime getLastRunTime() {
        return lastRunTime;
    }

    public void setLastRunTime(LocalDateTime lastRunTime) {
        this.lastRunTime = lastRunTime;
    }

    public LocalDateTime getNextRunTime() {
        return nextRunTime;
    }

    public void setNextRunTime(LocalDateTime nextRunTime) {
        this.nextRunTime = nextRunTime;
    }

    public String getLastRunStatus() {
        return lastRunStatus;
    }

    public void setLastRunStatus(String lastRunStatus) {
        this.lastRunStatus = lastRunStatus;
    }

    public String getLastErrorMessage() {
        return lastErrorMessage;
    }

    public void setLastErrorMessage(String lastErrorMessage) {
        this.lastErrorMessage = lastErrorMessage;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getTotalScheduledRuns() {
        return totalScheduledRuns;
    }

    public void setTotalScheduledRuns(Long totalScheduledRuns) {
        this.totalScheduledRuns = totalScheduledRuns;
    }

    public Long getSuccessfulRuns() {
        return successfulRuns;
    }

    public void setSuccessfulRuns(Long successfulRuns) {
        this.successfulRuns = successfulRuns;
    }

    public Long getFailedRuns() {
        return failedRuns;
    }

    public void setFailedRuns(Long failedRuns) {
        this.failedRuns = failedRuns;
    }

    public String getScheduleDescription() {
        return scheduleDescription;
    }

    public void setScheduleDescription(String scheduleDescription) {
        this.scheduleDescription = scheduleDescription;
    }
}

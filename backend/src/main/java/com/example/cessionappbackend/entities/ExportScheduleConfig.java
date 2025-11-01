package com.example.cessionappbackend.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity representing the export schedule configuration
 * Stores settings for automatic scheduled exports to Supabase
 */
@Entity
@Table(name = "export_schedule_config")
public class ExportScheduleConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = false;

    @Column(name = "cron_expression", nullable = false)
    private String cronExpression = "0 0 10 * * SAT"; // Default: Every Saturday at 10:00 AM

    @Column(name = "last_run_time")
    private LocalDateTime lastRunTime;

    @Column(name = "next_run_time")
    private LocalDateTime nextRunTime;

    @Column(name = "last_run_status")
    @Enumerated(EnumType.STRING)
    private RunStatus lastRunStatus;

    @Column(name = "last_error_message")
    private String lastErrorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "total_scheduled_runs")
    private Long totalScheduledRuns = 0L;

    @Column(name = "successful_runs")
    private Long successfulRuns = 0L;

    @Column(name = "failed_runs")
    private Long failedRuns = 0L;

    public enum RunStatus {
        SUCCESS,
        FAILED,
        SKIPPED,
        IN_PROGRESS
    }

    public ExportScheduleConfig() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
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

    public RunStatus getLastRunStatus() {
        return lastRunStatus;
    }

    public void setLastRunStatus(RunStatus lastRunStatus) {
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

    public void incrementTotalRuns() {
        this.totalScheduledRuns = (this.totalScheduledRuns == null ? 0 : this.totalScheduledRuns) + 1;
    }

    public void incrementSuccessfulRuns() {
        this.successfulRuns = (this.successfulRuns == null ? 0 : this.successfulRuns) + 1;
    }

    public void incrementFailedRuns() {
        this.failedRuns = (this.failedRuns == null ? 0 : this.failedRuns) + 1;
    }
}

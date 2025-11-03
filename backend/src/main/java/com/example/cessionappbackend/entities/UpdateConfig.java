package com.example.cessionappbackend.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity representing the update configuration
 * Stores user preferences for automatic/manual updates
 */
@Entity
@Table(name = "update_config")
public class UpdateConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auto_update_enabled", nullable = false)
    private boolean autoUpdateEnabled = false;

    @Column(name = "check_on_startup", nullable = false)
    private boolean checkOnStartup = true;

    @Column(name = "check_on_settings_open", nullable = false)
    private boolean checkOnSettingsOpen = true;

    @Column(name = "last_check_time")
    private LocalDateTime lastCheckTime;

    @Column(name = "total_update_checks")
    private Long totalUpdateChecks = 0L;

    @Column(name = "successful_updates")
    private Long successfulUpdates = 0L;

    @Column(name = "failed_updates")
    private Long failedUpdates = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UpdateConfig() {
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

    public boolean isAutoUpdateEnabled() {
        return autoUpdateEnabled;
    }

    public void setAutoUpdateEnabled(boolean autoUpdateEnabled) {
        this.autoUpdateEnabled = autoUpdateEnabled;
    }

    public boolean isCheckOnStartup() {
        return checkOnStartup;
    }

    public void setCheckOnStartup(boolean checkOnStartup) {
        this.checkOnStartup = checkOnStartup;
    }

    public boolean isCheckOnSettingsOpen() {
        return checkOnSettingsOpen;
    }

    public void setCheckOnSettingsOpen(boolean checkOnSettingsOpen) {
        this.checkOnSettingsOpen = checkOnSettingsOpen;
    }

    public LocalDateTime getLastCheckTime() {
        return lastCheckTime;
    }

    public void setLastCheckTime(LocalDateTime lastCheckTime) {
        this.lastCheckTime = lastCheckTime;
    }

    public Long getTotalUpdateChecks() {
        return totalUpdateChecks;
    }

    public void setTotalUpdateChecks(Long totalUpdateChecks) {
        this.totalUpdateChecks = totalUpdateChecks;
    }

    public Long getSuccessfulUpdates() {
        return successfulUpdates;
    }

    public void setSuccessfulUpdates(Long successfulUpdates) {
        this.successfulUpdates = successfulUpdates;
    }

    public Long getFailedUpdates() {
        return failedUpdates;
    }

    public void setFailedUpdates(Long failedUpdates) {
        this.failedUpdates = failedUpdates;
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

    public void incrementTotalUpdateChecks() {
        this.totalUpdateChecks = (this.totalUpdateChecks == null ? 0 : this.totalUpdateChecks) + 1;
    }

    public void incrementSuccessfulUpdates() {
        this.successfulUpdates = (this.successfulUpdates == null ? 0 : this.successfulUpdates) + 1;
    }

    public void incrementFailedUpdates() {
        this.failedUpdates = (this.failedUpdates == null ? 0 : this.failedUpdates) + 1;
    }
}
package com.example.cessionappbackend.dto;

import com.example.cessionappbackend.entities.UpdateConfig;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

/**
 * DTO for update configuration
 */
public class UpdateConfigDTO {

    private Long id;
    private boolean autoUpdateEnabled;
    private boolean checkOnStartup;
    private boolean checkOnSettingsOpen;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastCheckTime;

    private Long totalUpdateChecks;
    private Long successfulUpdates;
    private Long failedUpdates;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    public UpdateConfigDTO() {
    }

    public UpdateConfigDTO(UpdateConfig config) {
        this.id = config.getId();
        this.autoUpdateEnabled = config.isAutoUpdateEnabled();
        this.checkOnStartup = config.isCheckOnStartup();
        this.checkOnSettingsOpen = config.isCheckOnSettingsOpen();
        this.lastCheckTime = config.getLastCheckTime();
        this.totalUpdateChecks = config.getTotalUpdateChecks();
        this.successfulUpdates = config.getSuccessfulUpdates();
        this.failedUpdates = config.getFailedUpdates();
        this.createdAt = config.getCreatedAt();
        this.updatedAt = config.getUpdatedAt();
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
}
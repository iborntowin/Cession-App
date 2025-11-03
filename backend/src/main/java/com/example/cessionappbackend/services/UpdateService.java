package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.UpdateConfigDTO;
import com.example.cessionappbackend.entities.UpdateConfig;
import com.example.cessionappbackend.repositories.UpdateConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service for managing update configuration
 * Handles user preferences for automatic/manual updates
 */
@Service
@Transactional
public class UpdateService {

    private static final Logger logger = LoggerFactory.getLogger(UpdateService.class);

    @Autowired
    private UpdateConfigRepository configRepository;

    /**
     * Initialize default configuration if none exists
     */
    public void initializeDefaultConfig() {
        long configCount = configRepository.count();
        if (configCount == 0) {
            logger.info("No update configuration found, creating default");
            UpdateConfig defaultConfig = new UpdateConfig();
            defaultConfig.setAutoUpdateEnabled(false); // Start with manual mode
            defaultConfig.setCheckOnStartup(true);
            defaultConfig.setCheckOnSettingsOpen(true);

            configRepository.save(defaultConfig);
            logger.info("Default update configuration created");
        }
    }

    /**
     * Get the current update configuration
     */
    @Transactional(readOnly = true)
    public UpdateConfigDTO getUpdateConfig() {
        initializeDefaultConfig(); // Ensure config exists

        Optional<UpdateConfig> config = configRepository.findActiveConfig();
        if (config.isPresent()) {
            return new UpdateConfigDTO(config.get());
        }

        // Should not reach here due to initializeDefaultConfig
        return new UpdateConfigDTO();
    }

    /**
     * Update update configuration
     */
    public UpdateConfigDTO updateUpdateConfig(UpdateConfigDTO dto) {
        logger.info("Updating update configuration: autoUpdate={}, checkOnStartup={}, checkOnSettings={}",
                   dto.isAutoUpdateEnabled(), dto.isCheckOnStartup(), dto.isCheckOnSettingsOpen());

        initializeDefaultConfig(); // Ensure config exists

        Optional<UpdateConfig> existingConfig = configRepository.findActiveConfig();
        UpdateConfig config;

        if (existingConfig.isPresent()) {
            config = existingConfig.get();
        } else {
            config = new UpdateConfig();
        }

        // Update fields
        config.setAutoUpdateEnabled(dto.isAutoUpdateEnabled());
        config.setCheckOnStartup(dto.isCheckOnStartup());
        config.setCheckOnSettingsOpen(dto.isCheckOnSettingsOpen());

        // Update last check time if provided
        if (dto.getLastCheckTime() != null) {
            config.setLastCheckTime(dto.getLastCheckTime());
        }

        // Update statistics if provided
        if (dto.getTotalUpdateChecks() != null) {
            config.setTotalUpdateChecks(dto.getTotalUpdateChecks());
        }
        if (dto.getSuccessfulUpdates() != null) {
            config.setSuccessfulUpdates(dto.getSuccessfulUpdates());
        }
        if (dto.getFailedUpdates() != null) {
            config.setFailedUpdates(dto.getFailedUpdates());
        }

        UpdateConfig saved = configRepository.save(config);
        logger.info("Update configuration updated successfully: id={}", saved.getId());

        return new UpdateConfigDTO(saved);
    }

    /**
     * Record a successful update
     */
    public void recordSuccessfulUpdate() {
        Optional<UpdateConfig> configOpt = configRepository.findActiveConfig();
        if (configOpt.isPresent()) {
            UpdateConfig config = configOpt.get();
            config.incrementSuccessfulUpdates();
            configRepository.save(config);
            logger.info("Successful update recorded");
        }
    }

    /**
     * Record a failed update
     */
    public void recordFailedUpdate() {
        Optional<UpdateConfig> configOpt = configRepository.findActiveConfig();
        if (configOpt.isPresent()) {
            UpdateConfig config = configOpt.get();
            config.incrementFailedUpdates();
            configRepository.save(config);
            logger.info("Failed update recorded");
        }
    }

    /**
     * Record an update check
     */
    public void recordUpdateCheck() {
        Optional<UpdateConfig> configOpt = configRepository.findActiveConfig();
        if (configOpt.isPresent()) {
            UpdateConfig config = configOpt.get();
            config.incrementTotalUpdateChecks();
            config.setLastCheckTime(LocalDateTime.now());
            configRepository.save(config);
            logger.info("Update check recorded");
        }
    }

    /**
     * Toggle auto-update mode
     */
    public UpdateConfigDTO toggleAutoUpdate(boolean enabled) {
        logger.info("Toggling auto-update: {}", enabled);

        initializeDefaultConfig();
        Optional<UpdateConfig> configOpt = configRepository.findActiveConfig();

        if (configOpt.isPresent()) {
            UpdateConfig config = configOpt.get();
            config.setAutoUpdateEnabled(enabled);

            UpdateConfig saved = configRepository.save(config);
            logger.info("Auto-update {}: configuration saved", enabled ? "enabled" : "disabled");

            return new UpdateConfigDTO(saved);
        }

        return new UpdateConfigDTO();
    }
}
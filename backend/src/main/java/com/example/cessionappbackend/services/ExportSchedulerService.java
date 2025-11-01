package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.ExportScheduleConfigDTO;
import com.example.cessionappbackend.dto.ExportStatusDTO;
import com.example.cessionappbackend.entities.ExportScheduleConfig;
import com.example.cessionappbackend.repositories.ExportScheduleConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

/**
 * Service for managing scheduled automatic exports
 * Handles configurable cron-based exports to Supabase
 */
@Service
@Transactional
public class ExportSchedulerService {

    private static final Logger logger = LoggerFactory.getLogger(ExportSchedulerService.class);

    @Autowired
    private ExportScheduleConfigRepository configRepository;

    @Autowired
    private ExportStatusService exportStatusService;

    private volatile boolean schedulerRunning = false;

    /**
     * Initialize default configuration if none exists
     */
    public void initializeDefaultConfig() {
        long configCount = configRepository.count();
        if (configCount == 0) {
            logger.info("No export schedule configuration found, creating default");
            ExportScheduleConfig defaultConfig = new ExportScheduleConfig();
            defaultConfig.setEnabled(false); // Start disabled by default
            defaultConfig.setCronExpression("0 0 10 * * SAT"); // Every Saturday at 10 AM
            
            // Calculate next run time
            defaultConfig.setNextRunTime(calculateNextRunTime(defaultConfig.getCronExpression()));
            
            configRepository.save(defaultConfig);
            logger.info("Default export schedule configuration created: {}", defaultConfig.getCronExpression());
        }
    }

    /**
     * Get the current schedule configuration
     */
    @Transactional(readOnly = true)
    public ExportScheduleConfigDTO getScheduleConfig() {
        initializeDefaultConfig(); // Ensure config exists
        
        Optional<ExportScheduleConfig> config = configRepository.findActiveConfig();
        if (config.isPresent()) {
            // Update next run time if needed
            ExportScheduleConfig cfg = config.get();
            if (cfg.getNextRunTime() == null || cfg.getNextRunTime().isBefore(LocalDateTime.now())) {
                cfg.setNextRunTime(calculateNextRunTime(cfg.getCronExpression()));
                configRepository.save(cfg);
            }
            return new ExportScheduleConfigDTO(cfg);
        }
        
        // Should not reach here due to initializeDefaultConfig
        return new ExportScheduleConfigDTO();
    }

    /**
     * Update schedule configuration
     */
    public ExportScheduleConfigDTO updateScheduleConfig(ExportScheduleConfigDTO dto) {
        logger.info("Updating export schedule configuration: enabled={}, cron={}", 
                   dto.isEnabled(), dto.getCronExpression());
        
        initializeDefaultConfig(); // Ensure config exists
        
        Optional<ExportScheduleConfig> existingConfig = configRepository.findActiveConfig();
        ExportScheduleConfig config;
        
        if (existingConfig.isPresent()) {
            config = existingConfig.get();
        } else {
            config = new ExportScheduleConfig();
        }
        
        // Update fields
        config.setEnabled(dto.isEnabled());
        
        // Validate and update cron expression
        if (dto.getCronExpression() != null && !dto.getCronExpression().isEmpty()) {
            if (isValidCronExpression(dto.getCronExpression())) {
                config.setCronExpression(dto.getCronExpression());
            } else {
                logger.warn("Invalid cron expression provided: {}, keeping existing: {}", 
                           dto.getCronExpression(), config.getCronExpression());
            }
        }
        
        // Calculate next run time
        config.setNextRunTime(calculateNextRunTime(config.getCronExpression()));
        
        ExportScheduleConfig saved = configRepository.save(config);
        logger.info("Export schedule configuration updated successfully: id={}", saved.getId());
        
        return new ExportScheduleConfigDTO(saved);
    }

    /**
     * Scheduled task that runs every minute to check if export should be executed
     * This checks the database configuration and cron expression dynamically
     */
    @Scheduled(fixedRate = 60000) // Check every minute
    public void checkAndRunScheduledExport() {
        if (schedulerRunning) {
            logger.debug("Scheduler already running, skipping this cycle");
            return;
        }

        try {
            schedulerRunning = true;
            
            Optional<ExportScheduleConfig> configOpt = configRepository.findActiveConfig();
            if (!configOpt.isPresent()) {
                return; // No configuration yet
            }

            ExportScheduleConfig config = configOpt.get();
            
            // Check if scheduling is enabled
            if (!config.isEnabled()) {
                return; // Scheduling disabled
            }

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime nextRun = config.getNextRunTime();

            // Check if it's time to run
            if (nextRun != null && !now.isBefore(nextRun)) {
                logger.info("Scheduled export triggered at {}, next scheduled time was {}", now, nextRun);
                runScheduledExport(config);
            }
            
        } catch (Exception e) {
            logger.error("Error in scheduled export check", e);
        } finally {
            schedulerRunning = false;
        }
    }

    /**
     * Execute the scheduled export
     */
    private void runScheduledExport(ExportScheduleConfig config) {
        logger.info("Starting scheduled export execution");
        
        try {
            // Update status to IN_PROGRESS
            config.setLastRunStatus(ExportScheduleConfig.RunStatus.IN_PROGRESS);
            config.incrementTotalRuns();
            configRepository.save(config);
            
            // Trigger the export
            ExportStatusDTO result = exportStatusService.forceManualExport();
            
            // Update configuration based on result
            config.setLastRunTime(LocalDateTime.now());
            
            if (result.getStatus().toString().equals("SUCCESS")) {
                logger.info("Scheduled export completed successfully");
                config.setLastRunStatus(ExportScheduleConfig.RunStatus.SUCCESS);
                config.incrementSuccessfulRuns();
                config.setLastErrorMessage(null);
            } else {
                logger.warn("Scheduled export failed: {}", result.getErrorMessage());
                config.setLastRunStatus(ExportScheduleConfig.RunStatus.FAILED);
                config.incrementFailedRuns();
                config.setLastErrorMessage(result.getErrorMessage());
            }
            
        } catch (Exception e) {
            logger.error("Scheduled export execution failed with exception", e);
            config.setLastRunStatus(ExportScheduleConfig.RunStatus.FAILED);
            config.setLastRunTime(LocalDateTime.now());
            config.incrementFailedRuns();
            config.setLastErrorMessage("Exception: " + e.getMessage());
        } finally {
            // Calculate and set next run time
            LocalDateTime nextRun = calculateNextRunTime(config.getCronExpression());
            config.setNextRunTime(nextRun);
            configRepository.save(config);
            
            logger.info("Next scheduled export at: {}", nextRun);
        }
    }

    /**
     * Calculate next run time based on cron expression
     */
    private LocalDateTime calculateNextRunTime(String cronExpression) {
        try {
            if (cronExpression == null || cronExpression.isEmpty()) {
                return null;
            }
            
            CronExpression cron = CronExpression.parse(cronExpression);
            ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
            ZonedDateTime next = cron.next(now);
            
            if (next != null) {
                return next.toLocalDateTime();
            }
        } catch (Exception e) {
            logger.error("Failed to calculate next run time for cron: {}", cronExpression, e);
        }
        
        return null;
    }

    /**
     * Validate cron expression
     */
    private boolean isValidCronExpression(String cronExpression) {
        try {
            CronExpression.parse(cronExpression);
            return true;
        } catch (Exception e) {
            logger.warn("Invalid cron expression: {}", cronExpression, e);
            return false;
        }
    }

    /**
     * Manually trigger a test run (does not update statistics)
     */
    public ExportStatusDTO triggerTestExport() {
        logger.info("Test export triggered manually");
        return exportStatusService.forceManualExport();
    }

    /**
     * Enable or disable scheduled exports
     */
    public ExportScheduleConfigDTO toggleScheduledExports(boolean enabled) {
        logger.info("Toggling scheduled exports: {}", enabled);
        
        initializeDefaultConfig();
        Optional<ExportScheduleConfig> configOpt = configRepository.findActiveConfig();
        
        if (configOpt.isPresent()) {
            ExportScheduleConfig config = configOpt.get();
            config.setEnabled(enabled);
            
            if (enabled) {
                // Recalculate next run time when enabling
                config.setNextRunTime(calculateNextRunTime(config.getCronExpression()));
            }
            
            ExportScheduleConfig saved = configRepository.save(config);
            logger.info("Scheduled exports {}: next run at {}", 
                       enabled ? "enabled" : "disabled", saved.getNextRunTime());
            
            return new ExportScheduleConfigDTO(saved);
        }
        
        return new ExportScheduleConfigDTO();
    }
}

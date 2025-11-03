package com.example.cessionappbackend.controllers;

import com.example.cessionappbackend.dto.UpdateConfigDTO;
import com.example.cessionappbackend.services.UpdateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for update management
 * Handles update configuration and preferences
 */
@RestController
@RequestMapping("/api/v1/updates")
@PreAuthorize("hasRole('ADMIN')")
public class UpdateController {

    private static final Logger logger = LoggerFactory.getLogger(UpdateController.class);

    @Autowired
    private UpdateService updateService;

    /**
     * Get current update configuration
     * GET /api/v1/updates/config
     */
    @GetMapping("/config")
    public ResponseEntity<UpdateConfigDTO> getUpdateConfig() {
        logger.debug("Request received to get update configuration");

        try {
            UpdateConfigDTO config = updateService.getUpdateConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            logger.error("Failed to get update configuration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update update configuration
     * POST /api/v1/updates/config
     */
    @PostMapping("/config")
    public ResponseEntity<UpdateConfigDTO> updateUpdateConfig(
            @RequestBody UpdateConfigDTO configDTO) {
        logger.info("Request received to update update configuration");

        try {
            UpdateConfigDTO updated = updateService.updateUpdateConfig(configDTO);
            logger.info("Update configuration updated successfully");
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            logger.error("Failed to update update configuration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Toggle auto-update on/off
     * POST /api/v1/updates/toggle-auto
     */
    @PostMapping("/toggle-auto")
    public ResponseEntity<UpdateConfigDTO> toggleAutoUpdate(
            @RequestParam boolean enabled) {
        logger.info("Request received to toggle auto-update: {}", enabled);

        try {
            UpdateConfigDTO updated = updateService.toggleAutoUpdate(enabled);
            logger.info("Auto-update toggled successfully: {}", enabled);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            logger.error("Failed to toggle auto-update", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Record a successful update (called by frontend after successful update)
     * POST /api/v1/updates/record-success
     */
    @PostMapping("/record-success")
    public ResponseEntity<Void> recordSuccessfulUpdate() {
        logger.info("Request received to record successful update");

        try {
            updateService.recordSuccessfulUpdate();
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Failed to record successful update", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Record a failed update (called by frontend after failed update)
     * POST /api/v1/updates/record-failure
     */
    @PostMapping("/record-failure")
    public ResponseEntity<Void> recordFailedUpdate() {
        logger.info("Request received to record failed update");

        try {
            updateService.recordFailedUpdate();
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Failed to record failed update", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Record an update check (called by frontend after checking for updates)
     * POST /api/v1/updates/record-check
     */
    @PostMapping("/record-check")
    public ResponseEntity<Void> recordUpdateCheck() {
        logger.info("Request received to record update check");

        try {
            updateService.recordUpdateCheck();
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Failed to record update check", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
package com.example.cessionappbackend.controllers;

import com.example.cessionappbackend.dto.ExportScheduleConfigDTO;
import com.example.cessionappbackend.dto.ExportStatusDTO;
import com.example.cessionappbackend.entities.ExportStatus;
import com.example.cessionappbackend.services.ExportSchedulerService;
import com.example.cessionappbackend.services.ExportStatusService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/export")
public class ExportController {

    private static final Logger logger = LoggerFactory.getLogger(ExportController.class);

    @Autowired
    private ExportStatusService exportStatusService;

    @Autowired
    private ExportSchedulerService exportSchedulerService;

    /**
     * Get the latest export status
     * GET /api/v1/export/status
     */
    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExportStatusDTO> getLatestExportStatus() {
        logger.debug("Request received to get latest export status");
        
        Optional<ExportStatusDTO> latestStatus = exportStatusService.getLatestExportStatus();
        
        if (latestStatus.isPresent()) {
            logger.debug("Found latest export status: {}", latestStatus.get().getStatus());
            return ResponseEntity.ok(latestStatus.get());
        } else {
            logger.debug("No export status found");
            return ResponseEntity.noContent().build();
        }
    }

    /**
     * Get the latest successful export status
     * GET /api/v1/export/status/successful
     */
    @GetMapping("/status/successful")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExportStatusDTO> getLatestSuccessfulExport() {
        logger.debug("Request received to get latest successful export status");
        
        Optional<ExportStatusDTO> latestSuccessful = exportStatusService.getLatestSuccessfulExport();
        
        if (latestSuccessful.isPresent()) {
            logger.debug("Found latest successful export from: {}", latestSuccessful.get().getExportTimestamp());
            return ResponseEntity.ok(latestSuccessful.get());
        } else {
            logger.debug("No successful export found");
            return ResponseEntity.noContent().build();
        }
    }

    /**
     * Get all export status records
     * GET /api/v1/export/status/all
     */
    @GetMapping("/status/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ExportStatusDTO>> getAllExportStatuses() {
        logger.debug("Request received to get all export statuses");
        
        List<ExportStatusDTO> allStatuses = exportStatusService.getAllExportStatuses();
        logger.debug("Found {} export status records", allStatuses.size());
        
        return ResponseEntity.ok(allStatuses);
    }

    /**
     * Get export status records by status
     * GET /api/v1/export/status/by-status?status=SUCCESS
     */
    @GetMapping("/status/by-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ExportStatusDTO>> getExportStatusesByStatus(
            @RequestParam ExportStatus.ExportStatusEnum status) {
        logger.debug("Request received to get export statuses with status: {}", status);
        
        List<ExportStatusDTO> statuses = exportStatusService.getExportStatusesByStatus(status);
        logger.debug("Found {} export status records with status {}", statuses.size(), status);
        
        return ResponseEntity.ok(statuses);
    }

    /**
     * Trigger a manual export
     * POST /api/v1/export/manual
     */
    @PostMapping("/manual")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExportStatusDTO> triggerManualExport() {
        logger.info("Request received to trigger manual export");
        
        try {
            ExportStatusDTO result = exportStatusService.forceManualExport();
            
            if (result.getStatus() == ExportStatus.ExportStatusEnum.SUCCESS) {
                logger.info("Manual export completed successfully: fileName={}, recordCount={}", 
                           result.getFileName(), result.getRecordCount());
                return ResponseEntity.ok(result);
            } else {
                logger.warn("Manual export failed: fileName={}, error={}", 
                           result.getFileName(), result.getErrorMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
            }
            
        } catch (Exception e) {
            logger.error("Manual export failed with exception", e);
            
            // Create error response with details
            ExportStatusDTO errorResult = new ExportStatusDTO(
                null, // id
                java.time.LocalDateTime.now(), // exportTimestamp
                ExportStatus.ExportStatusEnum.FAILED, // status
                null, // supabaseUrl
                "export-error-" + System.currentTimeMillis() + ".json", // fileName
                0, // recordCount
                0, // cessionCount
                0, // paymentCount
                0, // workplaceCount
                0, // jobCount
                "Export failed: " + e.getMessage(), // errorMessage
                0L, // fileSizeBytes
                java.time.LocalDateTime.now() // createdAt
            );
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResult);
        }
    }

    /**
     * Get export statistics
     * GET /api/v1/export/statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExportStatusService.ExportStatisticsDTO> getExportStatistics() {
        logger.debug("Request received to get export statistics");
        
        ExportStatusService.ExportStatisticsDTO statistics = exportStatusService.getExportStatistics();
        logger.debug("Retrieved export statistics: {} total, {} successful, {} failed", 
                    statistics.getTotalExports(), statistics.getSuccessfulExports(), statistics.getFailedExports());
        
        return ResponseEntity.ok(statistics);
    }

    /**
     * Health check endpoint for export functionality
     * GET /api/v1/export/health
     */
    @GetMapping("/health")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> healthCheck() {
        logger.debug("Export health check requested");
        
        try {
            // Check if we can access the latest export status
            exportStatusService.getLatestExportStatus();
            return ResponseEntity.ok("Export service is healthy");
        } catch (Exception e) {
            logger.error("Export service health check failed", e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Export service is not healthy: " + e.getMessage());
        }
    }

    /**
     * Get the latest successful export status for mobile app (public access)
     * GET /api/v1/export/mobile/status
     */
    @GetMapping("/mobile/status")
    public ResponseEntity<ExportStatusDTO> getMobileExportStatus() {
        logger.debug("Mobile app requesting latest export status");
        
        Optional<ExportStatusDTO> latestSuccessful = exportStatusService.getLatestSuccessfulExport();
        
        if (latestSuccessful.isPresent()) {
            logger.debug("Found latest successful export for mobile: {}", latestSuccessful.get().getExportTimestamp());
            return ResponseEntity.ok(latestSuccessful.get());
        } else {
            logger.debug("No successful export found for mobile");
            return ResponseEntity.noContent().build();
        }
    }

    /**
     * Trigger a manual export for mobile app (public access)
     * POST /api/v1/export/mobile/trigger
     */
    @PostMapping("/mobile/trigger")
    public ResponseEntity<ExportStatusDTO> triggerMobileExport() {
        logger.info("Mobile app requesting manual export");
        
        try {
            ExportStatusDTO result = exportStatusService.forceManualExport();
            
            if (result.getStatus() == ExportStatus.ExportStatusEnum.SUCCESS) {
                logger.info("Mobile export completed successfully");
                return ResponseEntity.ok(result);
            } else {
                logger.warn("Mobile export failed: {}", result.getErrorMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
            }
            
        } catch (Exception e) {
            logger.error("Mobile export failed with exception", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get current schedule configuration
     * GET /api/v1/export/schedule/config
     */
    @GetMapping("/schedule/config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExportScheduleConfigDTO> getScheduleConfig() {
        logger.debug("Request received to get schedule configuration");
        
        try {
            ExportScheduleConfigDTO config = exportSchedulerService.getScheduleConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            logger.error("Failed to get schedule configuration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update schedule configuration
     * POST /api/v1/export/schedule/config
     */
    @PostMapping("/schedule/config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExportScheduleConfigDTO> updateScheduleConfig(
            @RequestBody ExportScheduleConfigDTO configDTO) {
        logger.info("Request received to update schedule configuration");
        
        try {
            ExportScheduleConfigDTO updated = exportSchedulerService.updateScheduleConfig(configDTO);
            logger.info("Schedule configuration updated successfully");
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            logger.error("Failed to update schedule configuration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Toggle scheduled exports on/off
     * POST /api/v1/export/schedule/toggle
     */
    @PostMapping("/schedule/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExportScheduleConfigDTO> toggleScheduledExports(
            @RequestParam boolean enabled) {
        logger.info("Request received to toggle scheduled exports: {}", enabled);
        
        try {
            ExportScheduleConfigDTO updated = exportSchedulerService.toggleScheduledExports(enabled);
            logger.info("Scheduled exports toggled successfully: {}", enabled);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            logger.error("Failed to toggle scheduled exports", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Trigger a test export (does not count towards statistics)
     * POST /api/v1/export/schedule/test
     */
    @PostMapping("/schedule/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExportStatusDTO> triggerTestExport() {
        logger.info("Request received to trigger test export");
        
        try {
            ExportStatusDTO result = exportSchedulerService.triggerTestExport();
            
            if (result.getStatus() == ExportStatus.ExportStatusEnum.SUCCESS) {
                logger.info("Test export completed successfully");
                return ResponseEntity.ok(result);
            } else {
                logger.warn("Test export failed: {}", result.getErrorMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
            }
        } catch (Exception e) {
            logger.error("Test export failed with exception", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
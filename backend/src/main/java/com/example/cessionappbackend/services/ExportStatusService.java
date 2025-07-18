package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.ExportStatusDTO;
import com.example.cessionappbackend.dto.SupabaseUploadResult;
import com.example.cessionappbackend.entities.ExportStatus;
import com.example.cessionappbackend.exceptions.ExportException;
import com.example.cessionappbackend.repositories.ExportStatusRepository;
import com.example.cessionappbackend.repositories.ClientRepository;
import com.example.cessionappbackend.repositories.CessionRepository;
import com.example.cessionappbackend.utils.ErrorLogger;
import com.example.cessionappbackend.utils.RetryHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ExportStatusService {

    private static final Logger logger = LoggerFactory.getLogger(ExportStatusService.class);

    @Autowired
    private ExportStatusRepository exportStatusRepository;

    @Autowired
    private DataExportService dataExportService;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private CessionRepository cessionRepository;

    /**
     * Get the latest export status
     */
    @Transactional(readOnly = true)
    public Optional<ExportStatusDTO> getLatestExportStatus() {
        logger.debug("Retrieving latest export status");
        return exportStatusRepository.findLatestExportStatus()
                .map(this::convertToDto);
    }

    /**
     * Get the latest successful export status
     */
    @Transactional(readOnly = true)
    public Optional<ExportStatusDTO> getLatestSuccessfulExport() {
        logger.debug("Retrieving latest successful export status");
        return exportStatusRepository.findLatestSuccessfulExport()
                .map(this::convertToDto);
    }

    /**
     * Get all export status records ordered by timestamp descending
     */
    @Transactional(readOnly = true)
    public List<ExportStatusDTO> getAllExportStatuses() {
        logger.debug("Retrieving all export statuses");
        return exportStatusRepository.findAllOrderByTimestampDesc()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get export status records by status
     */
    @Transactional(readOnly = true)
    public List<ExportStatusDTO> getExportStatusesByStatus(ExportStatus.ExportStatusEnum status) {
        logger.debug("Retrieving export statuses with status: {}", status);
        return exportStatusRepository.findByStatusOrderByExportTimestampDesc(status)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Record a successful export
     */
    public ExportStatusDTO recordSuccessfulExport(String fileName, String supabaseUrl, 
                                                 Integer recordCount, Integer cessionCount, 
                                                 Long fileSizeBytes) {
        logger.info("Recording successful export: fileName={}, recordCount={}, cessionCount={}", 
                   fileName, recordCount, cessionCount);
        
        ExportStatus exportStatus = new ExportStatus(
                LocalDateTime.now(),
                supabaseUrl,
                fileName,
                recordCount,
                cessionCount,
                fileSizeBytes
        );
        
        ExportStatus saved = exportStatusRepository.save(exportStatus);
        logger.info("Successfully recorded export status with ID: {}", saved.getId());
        
        return convertToDto(saved);
    }

    /**
     * Record a failed export
     */
    public ExportStatusDTO recordFailedExport(String fileName, String errorMessage) {
        logger.warn("Recording failed export: fileName={}, error={}", fileName, errorMessage);
        
        ExportStatus exportStatus = new ExportStatus(
                LocalDateTime.now(),
                fileName,
                errorMessage
        );
        
        ExportStatus saved = exportStatusRepository.save(exportStatus);
        logger.info("Successfully recorded failed export status with ID: {}", saved.getId());
        
        return convertToDto(saved);
    }

    /**
     * Force a manual export and return the result
     */
    public ExportStatusDTO forceManualExport() {
        long startTime = System.currentTimeMillis();
        String fileName = generateMobileExportFileName();
        
        try {
            return RetryHandler.executeExportWithRetry("forceManualExport", () -> {
                logger.info("Starting manual export process with file: {}", fileName);
                
                // Record in-progress status
                ExportStatus inProgressStatus = new ExportStatus();
                inProgressStatus.setExportTimestamp(LocalDateTime.now());
                inProgressStatus.setStatus(ExportStatus.ExportStatusEnum.IN_PROGRESS);
                inProgressStatus.setFileName(fileName);
                
                try {
                    exportStatusRepository.save(inProgressStatus);
                } catch (Exception e) {
                    ErrorLogger.logError("forceManualExport", e, 
                        ErrorLogger.context()
                            .add("operation", "save_in_progress_status")
                            .add("fileName", fileName)
                            .build());
                    throw ExportException.dataGenerationFailed("Failed to record in-progress status", e);
                }
                
                // Generate JSON export with comprehensive error handling
                String jsonData;
                try {
                    jsonData = dataExportService.generateMinifiedJsonExport();
                    if (jsonData == null || jsonData.trim().isEmpty()) {
                        throw ExportException.dataGenerationFailed("Export service returned empty data", null);
                    }
                } catch (Exception e) {
                    ErrorLogger.logError("forceManualExport", e, 
                        ErrorLogger.context()
                            .add("operation", "generate_json")
                            .add("fileName", fileName)
                            .build());
                    
                    if (e instanceof ExportException) {
                        throw e;
                    }
                    throw ExportException.dataGenerationFailed("Failed to generate JSON export", e);
                }
                
                byte[] jsonBytes = jsonData.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                
                // Upload to Supabase with error handling
                SupabaseUploadResult uploadResult;
                try {
                    uploadResult = supabaseStorageService.uploadFile(fileName, jsonBytes);
                    if (uploadResult == null) {
                        throw ExportException.uploadFailed("Upload service returned null result", null, true);
                    }
                } catch (Exception e) {
                    ErrorLogger.logError("forceManualExport", e, 
                        ErrorLogger.context()
                            .add("operation", "upload_to_supabase")
                            .add("fileName", fileName)
                            .add("fileSizeBytes", jsonBytes.length)
                            .build());
                    
                    if (e instanceof ExportException) {
                        throw e;
                    }
                    throw ExportException.uploadFailed("Failed to upload to Supabase", e, true);
                }
                
                if (uploadResult.isSuccess()) {
                    // Get record counts with error handling
                    int recordCount = 0;
                    int cessionCount = 0;
                    
                    try {
                        recordCount = (int) clientRepository.count();
                        cessionCount = (int) cessionRepository.count();
                    } catch (Exception e) {
                        ErrorLogger.logWarning("forceManualExport", "Could not get record counts from database", 
                            ErrorLogger.context()
                                .add("fileName", fileName)
                                .add("error", e.getMessage())
                                .build());
                        
                        // Fallback to parsing JSON
                        try {
                            recordCount = jsonData.split("\"clients\":\\[").length > 1 ? 
                                         jsonData.split("\"fullName\"").length - 1 : 0;
                            cessionCount = jsonData.split("\"monthlyPayment\"").length - 1;
                        } catch (Exception parseEx) {
                            ErrorLogger.logWarning("forceManualExport", "Could not parse record counts from JSON", 
                                ErrorLogger.context()
                                    .add("fileName", fileName)
                                    .add("parseError", parseEx.getMessage())
                                    .build());
                        }
                    }
                    
                    long duration = System.currentTimeMillis() - startTime;
                    ErrorLogger.logSuccess("forceManualExport", 
                        ErrorLogger.context()
                            .add("fileName", fileName)
                            .add("recordCount", recordCount)
                            .add("cessionCount", cessionCount)
                            .add("fileSizeBytes", jsonBytes.length)
                            .add("durationMs", duration)
                            .add("publicUrl", uploadResult.getPublicUrl())
                            .build());
                    
                    // Record successful export
                    return recordSuccessfulExport(
                            fileName,
                            uploadResult.getPublicUrl(),
                            recordCount,
                            cessionCount,
                            (long) jsonBytes.length
                    );
                } else {
                    // Record failed export
                    String errorMessage = uploadResult.getErrorMessage() != null ? 
                                        uploadResult.getErrorMessage() : "Upload failed with unknown error";
                    
                    ErrorLogger.logError("forceManualExport", 
                        new Exception("Upload failed: " + errorMessage), 
                        ErrorLogger.context()
                            .add("fileName", fileName)
                            .add("uploadError", errorMessage)
                            .add("fileSizeBytes", jsonBytes.length)
                            .build());
                    
                    return recordFailedExport(fileName, errorMessage);
                }
            });
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            ErrorLogger.logError("forceManualExport", e, 
                ErrorLogger.context()
                    .add("fileName", fileName)
                    .add("durationMs", duration)
                    .add("finalFailure", true)
                    .build());
            
            // Ensure we record the failure in the database
            try {
                return recordFailedExport(fileName, e.getMessage());
            } catch (Exception recordEx) {
                ErrorLogger.logError("forceManualExport", recordEx, 
                    ErrorLogger.context()
                        .add("operation", "record_failed_export")
                        .add("fileName", fileName)
                        .add("originalError", e.getMessage())
                        .build());
                
                // Create a minimal failure DTO if we can't even record to database
                return new ExportStatusDTO(
                    null, // id
                    LocalDateTime.now(), // exportTimestamp
                    ExportStatus.ExportStatusEnum.FAILED, // status
                    null, // supabaseUrl
                    fileName, // fileName
                    0, // recordCount
                    0, // cessionCount
                    "Failed to export and record failure: " + e.getMessage(), // errorMessage
                    0L, // fileSizeBytes
                    LocalDateTime.now() // createdAt
                );
            }
        }
    }

    /**
     * Get export statistics
     */
    @Transactional(readOnly = true)
    public ExportStatisticsDTO getExportStatistics() {
        logger.debug("Retrieving export statistics");
        
        long totalExports = exportStatusRepository.count();
        long successfulExports = exportStatusRepository.countByStatus(ExportStatus.ExportStatusEnum.SUCCESS);
        long failedExports = exportStatusRepository.countByStatus(ExportStatus.ExportStatusEnum.FAILED);
        
        Optional<ExportStatus> latestSuccessful = exportStatusRepository.findLatestSuccessfulExport();
        
        return new ExportStatisticsDTO(
                totalExports,
                successfulExports,
                failedExports,
                latestSuccessful.map(ExportStatus::getExportTimestamp).orElse(null)
        );
    }

    /**
     * Generate a mobile-friendly export filename with timestamp
     * Format: mobile-export_YYYY-MM-DD_HH-mm-ss.json
     */
    private String generateMobileExportFileName() {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
        return "mobile-export_" + now.format(formatter) + ".json";
    }

    /**
     * Convert ExportStatus entity to DTO
     */
    private ExportStatusDTO convertToDto(ExportStatus exportStatus) {
        return new ExportStatusDTO(exportStatus);
    }

    /**
     * DTO for export statistics
     */
    public static class ExportStatisticsDTO {
        private long totalExports;
        private long successfulExports;
        private long failedExports;
        private LocalDateTime lastSuccessfulExport;

        public ExportStatisticsDTO(long totalExports, long successfulExports, 
                                  long failedExports, LocalDateTime lastSuccessfulExport) {
            this.totalExports = totalExports;
            this.successfulExports = successfulExports;
            this.failedExports = failedExports;
            this.lastSuccessfulExport = lastSuccessfulExport;
        }

        // Getters
        public long getTotalExports() { return totalExports; }
        public long getSuccessfulExports() { return successfulExports; }
        public long getFailedExports() { return failedExports; }
        public LocalDateTime getLastSuccessfulExport() { return lastSuccessfulExport; }
    }
}
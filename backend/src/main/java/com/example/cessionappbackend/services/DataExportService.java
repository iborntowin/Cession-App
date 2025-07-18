package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.export.*;
import com.example.cessionappbackend.entities.Client;
import com.example.cessionappbackend.entities.Cession;
import com.example.cessionappbackend.exceptions.ExportException;
import com.example.cessionappbackend.repositories.ClientRepository;
import com.example.cessionappbackend.utils.ErrorLogger;
import com.example.cessionappbackend.utils.RetryHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for exporting client and cession data to JSON format
 */
@Service
public class DataExportService {
    
    private static final Logger logger = LoggerFactory.getLogger(DataExportService.class);
    
    @Autowired
    private ClientRepository clientRepository;
    
    private final ObjectMapper objectMapper;
    
    public DataExportService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        // Ensure proper UTF-8 encoding for Arabic characters
        this.objectMapper.getFactory().setCharacterEscapes(null);
    }
    
    /**
     * Generate JSON export of all client and cession data
     * @return JSON string containing all export data
     */
    @Transactional(readOnly = true)
    public String generateJsonExport() {
        long startTime = System.currentTimeMillis();
        
        try {
            return RetryHandler.executeExportWithRetry("generateJsonExport", () -> {
                logger.info("Starting data export generation");
                
                // Validate preconditions
                validateExportPreconditions();
                
                // Fetch all clients with their relationships
                List<Client> clients;
                try {
                    clients = clientRepository.findAll();
                    if (clients == null) {
                        throw ExportException.dataGenerationFailed("Client repository returned null", null);
                    }
                    logger.debug("Found {} clients for export", clients.size());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to fetch clients from database", e);
                }
                
                // Convert to export DTOs with error handling
                List<ExportClientDTO> exportClients;
                try {
                    exportClients = clients.stream()
                            .map(this::convertToExportClientDTOSafely)
                            .filter(dto -> dto != null) // Filter out failed conversions
                            .collect(Collectors.toList());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to convert clients to export DTOs", e);
                }
                
                // Calculate total cession count
                int totalCessions = exportClients.stream()
                        .mapToInt(client -> client.getCessions() != null ? client.getCessions().size() : 0)
                        .sum();
                
                // Create metadata
                ExportMetadataDTO.RecordCountDTO recordCount = new ExportMetadataDTO.RecordCountDTO(
                        exportClients.size(), totalCessions);
                ExportMetadataDTO metadata = new ExportMetadataDTO(
                        OffsetDateTime.now(), "1.0", recordCount);
                
                // Create main export object
                ExportDataDTO exportData = new ExportDataDTO(metadata, exportClients);
                
                // Convert to JSON with error handling
                String jsonResult;
                try {
                    jsonResult = objectMapper.writeValueAsString(exportData);
                    if (jsonResult == null || jsonResult.trim().isEmpty()) {
                        throw ExportException.dataGenerationFailed("JSON serialization produced empty result", null);
                    }
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to serialize export data to JSON", e);
                }
                
                long duration = System.currentTimeMillis() - startTime;
                ErrorLogger.logSuccess("generateJsonExport", 
                    ErrorLogger.context()
                        .add("clientCount", exportClients.size())
                        .add("cessionCount", totalCessions)
                        .add("jsonSizeBytes", jsonResult.length())
                        .add("durationMs", duration)
                        .build());
                
                logger.info("Successfully generated JSON export with {} clients and {} cessions in {}ms", 
                           exportClients.size(), totalCessions, duration);
                
                return jsonResult;
            });
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            ErrorLogger.logError("generateJsonExport", e, 
                ErrorLogger.context()
                    .add("durationMs", duration)
                    .add("operationType", "formatted")
                    .build());
            
            if (e instanceof ExportException) {
                throw (ExportException) e;
            }
            throw ExportException.dataGenerationFailed("Failed to generate JSON export", e);
        }
    }
    
    /**
     * Generate minified JSON export (without indentation)
     * @return Minified JSON string containing all export data
     */
    @Transactional(readOnly = true)
    public String generateMinifiedJsonExport() {
        long startTime = System.currentTimeMillis();
        
        try {
            return RetryHandler.executeExportWithRetry("generateMinifiedJsonExport", () -> {
                logger.info("Starting minified data export generation");
                
                // Validate preconditions
                validateExportPreconditions();
                
                // Create a minified object mapper
                ObjectMapper minifiedMapper = new ObjectMapper();
                minifiedMapper.registerModule(new JavaTimeModule());
                minifiedMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
                minifiedMapper.disable(SerializationFeature.INDENT_OUTPUT);
                // Ensure proper UTF-8 encoding for Arabic characters
                minifiedMapper.getFactory().setCharacterEscapes(null);
                
                // Fetch all clients with their relationships
                List<Client> clients;
                try {
                    clients = clientRepository.findAll();
                    if (clients == null) {
                        throw ExportException.dataGenerationFailed("Client repository returned null", null);
                    }
                    logger.debug("Found {} clients for minified export", clients.size());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to fetch clients from database", e);
                }
                
                // Convert to export DTOs with error handling
                List<ExportClientDTO> exportClients;
                try {
                    exportClients = clients.stream()
                            .map(this::convertToExportClientDTOSafely)
                            .filter(dto -> dto != null) // Filter out failed conversions
                            .collect(Collectors.toList());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to convert clients to export DTOs", e);
                }
                
                // Calculate total cession count
                int totalCessions = exportClients.stream()
                        .mapToInt(client -> client.getCessions() != null ? client.getCessions().size() : 0)
                        .sum();
                
                // Create metadata
                ExportMetadataDTO.RecordCountDTO recordCount = new ExportMetadataDTO.RecordCountDTO(
                        exportClients.size(), totalCessions);
                ExportMetadataDTO metadata = new ExportMetadataDTO(
                        OffsetDateTime.now(), "1.0", recordCount);
                
                // Create main export object
                ExportDataDTO exportData = new ExportDataDTO(metadata, exportClients);
                
                // Convert to minified JSON with error handling
                String jsonResult;
                try {
                    jsonResult = minifiedMapper.writeValueAsString(exportData);
                    if (jsonResult == null || jsonResult.trim().isEmpty()) {
                        throw ExportException.dataGenerationFailed("JSON serialization produced empty result", null);
                    }
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to serialize export data to JSON", e);
                }
                
                long duration = System.currentTimeMillis() - startTime;
                ErrorLogger.logSuccess("generateMinifiedJsonExport", 
                    ErrorLogger.context()
                        .add("clientCount", exportClients.size())
                        .add("cessionCount", totalCessions)
                        .add("jsonSizeBytes", jsonResult.length())
                        .add("durationMs", duration)
                        .build());
                
                logger.info("Successfully generated minified JSON export with {} clients and {} cessions in {}ms", 
                           exportClients.size(), totalCessions, duration);
                
                return jsonResult;
            });
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            ErrorLogger.logError("generateMinifiedJsonExport", e, 
                ErrorLogger.context()
                    .add("durationMs", duration)
                    .add("operationType", "minified")
                    .build());
            
            if (e instanceof ExportException) {
                throw (ExportException) e;
            }
            throw ExportException.dataGenerationFailed("Failed to generate minified JSON export", e);
        }
    }
    
    /**
     * Convert Client entity to ExportClientDTO
     */
    private ExportClientDTO convertToExportClientDTO(Client client) {
        // Convert workplace
        ExportWorkplaceDTO workplaceDTO = null;
        if (client.getWorkplace() != null) {
            workplaceDTO = new ExportWorkplaceDTO(
                    client.getWorkplace().getId(),
                    client.getWorkplace().getName()
            );
        }
        
        // Convert job
        ExportJobDTO jobDTO = null;
        if (client.getJob() != null) {
            jobDTO = new ExportJobDTO(
                    client.getJob().getId(),
                    client.getJob().getName()
            );
        }
        
        // Convert cessions
        List<ExportCessionDTO> cessionDTOs = null;
        if (client.getCessions() != null) {
            cessionDTOs = client.getCessions().stream()
                    .map(this::convertToExportCessionDTO)
                    .collect(Collectors.toList());
        }
        
        return new ExportClientDTO(
                client.getId(),
                client.getClientNumber(),
                client.getFullName(),
                client.getCin(),
                client.getPhoneNumber(),
                client.getAddress(),
                client.getWorkerNumber(),
                workplaceDTO,
                jobDTO,
                cessionDTOs
        );
    }
    
    /**
     * Convert Cession entity to ExportCessionDTO
     */
    private ExportCessionDTO convertToExportCessionDTO(Cession cession) {
        return new ExportCessionDTO(
                cession.getId(),
                cession.getMonthlyPayment(),
                cession.getStartDate(),
                cession.getEndDate(),
                cession.getExpectedPayoffDate(),
                cession.getRemainingBalance(),
                cession.getTotalLoanAmount(),
                cession.getCurrentProgress(),
                cession.getMonthsRemaining(),
                cession.getBankOrAgency(),
                cession.getStatus()
        );
    }
    
    /**
     * Safely convert Client entity to ExportClientDTO with error handling
     */
    private ExportClientDTO convertToExportClientDTOSafely(Client client) {
        try {
            if (client == null) {
                ErrorLogger.logWarning("convertToExportClientDTO", "Null client encountered", null);
                return null;
            }
            
            return convertToExportClientDTO(client);
            
        } catch (Exception e) {
            ErrorLogger.logError("convertToExportClientDTO", e, 
                ErrorLogger.context()
                    .add("clientId", client != null ? client.getId() : "null")
                    .add("clientNumber", client != null ? client.getClientNumber() : "null")
                    .build());
            
            // Return null to filter out this client from the export
            // This allows the export to continue even if one client has issues
            return null;
        }
    }
    
    /**
     * Validate preconditions for export operations
     */
    private void validateExportPreconditions() {
        try {
            if (clientRepository == null) {
                throw ExportException.configurationError("Client repository is not initialized");
            }
            
            if (objectMapper == null) {
                throw ExportException.configurationError("Object mapper is not initialized");
            }
            
            // Test database connectivity
            try {
                clientRepository.count();
            } catch (Exception e) {
                throw ExportException.configurationError("Database connection is not available: " + e.getMessage());
            }
            
        } catch (ExportException e) {
            throw e;
        } catch (Exception e) {
            throw ExportException.configurationError("Failed to validate export preconditions: " + e.getMessage());
        }
    }
    
    /**
     * Get export health status
     */
    public ExportHealthStatus getExportHealthStatus() {
        try {
            // Check database connectivity
            long clientCount = clientRepository.count();
            
            // Check object mapper
            boolean objectMapperHealthy = objectMapper != null;
            
            // Test JSON serialization with minimal data
            boolean serializationHealthy = false;
            try {
                ExportMetadataDTO.RecordCountDTO recordCount = new ExportMetadataDTO.RecordCountDTO(0, 0);
                ExportMetadataDTO metadata = new ExportMetadataDTO(OffsetDateTime.now(), "1.0", recordCount);
                ExportDataDTO testData = new ExportDataDTO(metadata, List.of());
                String testJson = objectMapper.writeValueAsString(testData);
                serializationHealthy = testJson != null && !testJson.trim().isEmpty();
            } catch (Exception e) {
                ErrorLogger.logWarning("getExportHealthStatus", "JSON serialization test failed", 
                    ErrorLogger.context().add("error", e.getMessage()).build());
            }
            
            boolean isHealthy = objectMapperHealthy && serializationHealthy;
            
            return new ExportHealthStatus(
                isHealthy,
                clientCount,
                objectMapperHealthy,
                serializationHealthy,
                isHealthy ? null : "One or more export components are not healthy"
            );
            
        } catch (Exception e) {
            ErrorLogger.logError("getExportHealthStatus", e, null);
            return new ExportHealthStatus(
                false,
                -1,
                false,
                false,
                "Failed to check export health: " + e.getMessage()
            );
        }
    }
    
    /**
     * Export health status data class
     */
    public static class ExportHealthStatus {
        private final boolean healthy;
        private final long clientCount;
        private final boolean objectMapperHealthy;
        private final boolean serializationHealthy;
        private final String errorMessage;
        
        public ExportHealthStatus(boolean healthy, long clientCount, boolean objectMapperHealthy, 
                                boolean serializationHealthy, String errorMessage) {
            this.healthy = healthy;
            this.clientCount = clientCount;
            this.objectMapperHealthy = objectMapperHealthy;
            this.serializationHealthy = serializationHealthy;
            this.errorMessage = errorMessage;
        }
        
        public boolean isHealthy() { return healthy; }
        public long getClientCount() { return clientCount; }
        public boolean isObjectMapperHealthy() { return objectMapperHealthy; }
        public boolean isSerializationHealthy() { return serializationHealthy; }
        public String getErrorMessage() { return errorMessage; }
    }
}
package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.export.*;
import com.example.cessionappbackend.entities.Client;
import com.example.cessionappbackend.entities.Cession;
import com.example.cessionappbackend.entities.Payment;
import com.example.cessionappbackend.entities.Workplace;
import com.example.cessionappbackend.entities.Job;
import com.example.cessionappbackend.exceptions.ExportException;
import com.example.cessionappbackend.repositories.ClientRepository;
import com.example.cessionappbackend.repositories.PaymentRepository;
import com.example.cessionappbackend.repositories.WorkplaceRepository;
import com.example.cessionappbackend.repositories.JobRepository;
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
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private WorkplaceRepository workplaceRepository;
    
    @Autowired
    private JobRepository jobRepository;
    
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
                
                // Fetch all payments
                List<Payment> payments;
                try {
                    payments = paymentRepository.findAll();
                    if (payments == null) {
                        payments = List.of(); // Use empty list as fallback
                    }
                    logger.debug("Found {} payments for export", payments.size());
                } catch (Exception e) {
                    logger.warn("Failed to fetch payments from database, using empty list", e);
                    payments = List.of();
                }
                
                // Fetch all workplaces
                List<Workplace> workplaces;
                try {
                    workplaces = workplaceRepository.findAll();
                    if (workplaces == null) {
                        workplaces = List.of(); // Use empty list as fallback
                    }
                    logger.debug("Found {} workplaces for export", workplaces.size());
                } catch (Exception e) {
                    logger.warn("Failed to fetch workplaces from database, using empty list", e);
                    workplaces = List.of();
                }
                
                // Fetch all jobs
                List<Job> jobs;
                try {
                    jobs = jobRepository.findAll();
                    if (jobs == null) {
                        jobs = List.of(); // Use empty list as fallback
                    }
                    logger.debug("Found {} jobs for export", jobs.size());
                } catch (Exception e) {
                    logger.warn("Failed to fetch jobs from database, using empty list", e);
                    jobs = List.of();
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
                
                // Convert payments to export DTOs
                List<ExportPaymentDTO> exportPayments;
                try {
                    exportPayments = payments.stream()
                            .map(this::convertToExportPaymentDTO)
                            .collect(Collectors.toList());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to convert payments to export DTOs", e);
                }
                
                // Convert workplaces to export DTOs
                List<ExportWorkplaceDTO> exportWorkplaces;
                try {
                    exportWorkplaces = workplaces.stream()
                            .map(this::convertToExportWorkplaceDTO)
                            .collect(Collectors.toList());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to convert workplaces to export DTOs", e);
                }
                
                // Convert jobs to export DTOs
                List<ExportJobDTO> exportJobs;
                try {
                    exportJobs = jobs.stream()
                            .map(this::convertToExportJobDTO)
                            .collect(Collectors.toList());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to convert jobs to export DTOs", e);
                }
                
                // Calculate total cession count
                int totalCessions = exportClients.stream()
                        .mapToInt(client -> client.getCessions() != null ? client.getCessions().size() : 0)
                        .sum();
                
                // Create metadata
                ExportMetadataDTO.RecordCountDTO recordCount = new ExportMetadataDTO.RecordCountDTO(
                        exportClients.size(), totalCessions, exportPayments.size(), exportWorkplaces.size(), exportJobs.size());
                ExportMetadataDTO metadata = new ExportMetadataDTO(
                        OffsetDateTime.now(), "1.0", recordCount);
                
                // Create main export object
                ExportDataDTO exportData = new ExportDataDTO(metadata, exportClients, exportPayments, exportWorkplaces, exportJobs);
                
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
                
                // Fetch all payments
                List<Payment> payments;
                try {
                    payments = paymentRepository.findAll();
                    if (payments == null) {
                        payments = List.of(); // Use empty list as fallback
                    }
                    logger.debug("Found {} payments for minified export", payments.size());
                } catch (Exception e) {
                    logger.warn("Failed to fetch payments from database, using empty list", e);
                    payments = List.of();
                }
                
                // Fetch all workplaces
                List<Workplace> workplaces;
                try {
                    workplaces = workplaceRepository.findAll();
                    if (workplaces == null) {
                        workplaces = List.of(); // Use empty list as fallback
                    }
                    logger.debug("Found {} workplaces for minified export", workplaces.size());
                } catch (Exception e) {
                    logger.warn("Failed to fetch workplaces from database, using empty list", e);
                    workplaces = List.of();
                }
                
                // Fetch all jobs
                List<Job> jobs;
                try {
                    jobs = jobRepository.findAll();
                    if (jobs == null) {
                        jobs = List.of(); // Use empty list as fallback
                    }
                    logger.debug("Found {} jobs for minified export", jobs.size());
                } catch (Exception e) {
                    logger.warn("Failed to fetch jobs from database, using empty list", e);
                    jobs = List.of();
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
                
                // Convert payments to export DTOs
                List<ExportPaymentDTO> exportPayments;
                try {
                    exportPayments = payments.stream()
                            .map(this::convertToExportPaymentDTO)
                            .collect(Collectors.toList());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to convert payments to export DTOs", e);
                }
                
                // Convert workplaces to export DTOs
                List<ExportWorkplaceDTO> exportWorkplaces;
                try {
                    exportWorkplaces = workplaces.stream()
                            .map(this::convertToExportWorkplaceDTO)
                            .collect(Collectors.toList());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to convert workplaces to export DTOs", e);
                }
                
                // Convert jobs to export DTOs
                List<ExportJobDTO> exportJobs;
                try {
                    exportJobs = jobs.stream()
                            .map(this::convertToExportJobDTO)
                            .collect(Collectors.toList());
                } catch (Exception e) {
                    throw ExportException.dataGenerationFailed("Failed to convert jobs to export DTOs", e);
                }
                
                // Calculate total cession count
                int totalCessions = exportClients.stream()
                        .mapToInt(client -> client.getCessions() != null ? client.getCessions().size() : 0)
                        .sum();
                
                // Create metadata
                ExportMetadataDTO.RecordCountDTO recordCount = new ExportMetadataDTO.RecordCountDTO(
                        exportClients.size(), totalCessions, exportPayments.size(), exportWorkplaces.size(), exportJobs.size());
                ExportMetadataDTO metadata = new ExportMetadataDTO(
                        OffsetDateTime.now(), "1.0", recordCount);
                
                // Create main export object
                ExportDataDTO exportData = new ExportDataDTO(metadata, exportClients, exportPayments, exportWorkplaces, exportJobs);
                
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
     * Convert Client entity to ExportClientDTO with error handling
     */
    private ExportClientDTO convertToExportClientDTOSafely(Client client) {
        try {
            return convertToExportClientDTO(client);
        } catch (Exception e) {
            logger.warn("Failed to convert client {} to export DTO: {}", 
                       client != null ? client.getId() : "null", e.getMessage());
            return null; // Return null to be filtered out
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
     * Convert Payment entity to ExportPaymentDTO
     */
    private ExportPaymentDTO convertToExportPaymentDTO(Payment payment) {
        return new ExportPaymentDTO(
                payment.getId(),
                payment.getCession().getId(),
                payment.getAmount(),
                payment.getPaymentDate(),
                payment.getNotes(),
                payment.getCreatedAt()
        );
    }
    
    /**
     * Convert Workplace entity to ExportWorkplaceDTO
     */
    private ExportWorkplaceDTO convertToExportWorkplaceDTO(Workplace workplace) {
        return new ExportWorkplaceDTO(
                workplace.getId(),
                workplace.getName()
        );
    }
    
    /**
     * Convert Job entity to ExportJobDTO
     */
    private ExportJobDTO convertToExportJobDTO(Job job) {
        return new ExportJobDTO(
                job.getId(),
                job.getName(),
                job.getWorkplace() != null ? job.getWorkplace().getId() : null
        );
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
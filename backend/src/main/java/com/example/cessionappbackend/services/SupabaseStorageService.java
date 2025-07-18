package com.example.cessionappbackend.services;

import com.example.cessionappbackend.config.SupabaseConfig;
import com.example.cessionappbackend.dto.SupabaseUploadResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Service for handling Supabase Storage operations
 */
@Service
public class SupabaseStorageService {
    
    private static final Logger logger = LoggerFactory.getLogger(SupabaseStorageService.class);
    
    @Autowired
    private SupabaseConfig supabaseConfig;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    public SupabaseStorageService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Upload a file from byte array to Supabase Storage
     * @param fileName The name of the file
     * @param fileContent The file content as byte array
     * @return SupabaseUploadResult containing upload status and public URL
     */
    public SupabaseUploadResult uploadFile(String fileName, byte[] fileContent) {
        long startTime = System.currentTimeMillis();
        
        try {
            logger.info("Starting upload to Supabase Storage: {}", fileName);
            
            // Attempt upload with retry logic
            SupabaseUploadResult result = uploadBytesWithRetry(fileContent, fileName, startTime);
            
            if (result.isSuccess()) {
                logger.info("Successfully uploaded {} to Supabase Storage in {}ms", 
                           fileName, result.getUploadTimeMs());
            } else {
                logger.error("Failed to upload {} to Supabase Storage: {}", 
                           fileName, result.getErrorMessage());
            }
            
            return result;
            
        } catch (Exception e) {
            long uploadTime = System.currentTimeMillis() - startTime;
            logger.error("Unexpected error during Supabase upload", e);
            return SupabaseUploadResult.failure(fileName, 
                "Unexpected error: " + e.getMessage(), uploadTime);
        }
    }

    /**
     * Upload a JSON string to Supabase Storage
     * @param jsonContent The JSON content to upload
     * @param fileName The name of the file (if null, generates timestamped name)
     * @return SupabaseUploadResult containing upload status and public URL
     */
    public SupabaseUploadResult uploadJsonFile(String jsonContent, String fileName) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Generate filename if not provided
            if (fileName == null || fileName.trim().isEmpty()) {
                fileName = generateTimestampedFileName();
            }
            
            logger.info("Starting upload to Supabase Storage: {}", fileName);
            
            // Attempt upload with retry logic
            SupabaseUploadResult result = uploadWithRetry(jsonContent, fileName, startTime);
            
            if (result.isSuccess()) {
                logger.info("Successfully uploaded {} to Supabase Storage in {}ms", 
                           fileName, result.getUploadTimeMs());
            } else {
                logger.error("Failed to upload {} to Supabase Storage: {}", 
                           fileName, result.getErrorMessage());
            }
            
            return result;
            
        } catch (Exception e) {
            long uploadTime = System.currentTimeMillis() - startTime;
            logger.error("Unexpected error during Supabase upload", e);
            return SupabaseUploadResult.failure(fileName, 
                "Unexpected error: " + e.getMessage(), uploadTime);
        }
    }
    
    /**
     * Generate a public URL for a file in Supabase Storage
     * @param fileName The name of the file
     * @return The public URL for the file
     */
    public String getPublicUrl(String fileName) {
        try {
            String bucketName = supabaseConfig.getMobile().getBucket();
            String publicUrl = String.format("%s/storage/v1/object/public/%s/%s", 
                                            supabaseConfig.getUrl(), bucketName, fileName);
            
            logger.debug("Generated public URL for {}: {}", fileName, publicUrl);
            return publicUrl;
            
        } catch (Exception e) {
            logger.error("Failed to generate public URL for file: {}", fileName, e);
            throw new RuntimeException("Failed to generate public URL", e);
        }
    }
    
    /**
     * Upload bytes with retry logic
     */
    private SupabaseUploadResult uploadBytesWithRetry(byte[] fileContent, String fileName, long startTime) {
        int maxAttempts = supabaseConfig.getMobile().getRetry().getMaxAttempts();
        long delayMs = supabaseConfig.getMobile().getRetry().getDelayMs();
        
        Exception lastException = null;
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                logger.debug("Upload attempt {} of {} for file: {}", attempt, maxAttempts, fileName);
                
                String publicUrl = performBytesUpload(fileContent, fileName);
                long uploadTime = System.currentTimeMillis() - startTime;
                
                return SupabaseUploadResult.success(fileName, publicUrl, uploadTime);
                
            } catch (Exception e) {
                lastException = e;
                logger.warn("Upload attempt {} failed for file {}: {}", 
                           attempt, fileName, e.getMessage());
                
                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(delayMs * attempt); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        long uploadTime = System.currentTimeMillis() - startTime;
        String errorMessage = String.format("Failed after %d attempts. Last error: %s", 
                                          maxAttempts, lastException != null ? lastException.getMessage() : "Unknown");
        
        return SupabaseUploadResult.failure(fileName, errorMessage, uploadTime);
    }

    /**
     * Upload with retry logic
     */
    private SupabaseUploadResult uploadWithRetry(String jsonContent, String fileName, long startTime) {
        int maxAttempts = supabaseConfig.getMobile().getRetry().getMaxAttempts();
        long delayMs = supabaseConfig.getMobile().getRetry().getDelayMs();
        
        Exception lastException = null;
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                logger.debug("Upload attempt {} of {} for file: {}", attempt, maxAttempts, fileName);
                
                String publicUrl = performUpload(jsonContent, fileName);
                long uploadTime = System.currentTimeMillis() - startTime;
                
                return SupabaseUploadResult.success(fileName, publicUrl, uploadTime);
                
            } catch (Exception e) {
                lastException = e;
                logger.warn("Upload attempt {} failed for file {}: {}", 
                           attempt, fileName, e.getMessage());
                
                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(delayMs * attempt); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        long uploadTime = System.currentTimeMillis() - startTime;
        String errorMessage = String.format("Failed after %d attempts. Last error: %s", 
                                          maxAttempts, lastException != null ? lastException.getMessage() : "Unknown");
        
        return SupabaseUploadResult.failure(fileName, errorMessage, uploadTime);
    }
    
    /**
     * Perform the actual upload of bytes to Supabase Storage
     */
    private String performBytesUpload(byte[] fileContent, String fileName) {
        try {
            String bucketName = supabaseConfig.getMobile().getBucket();
            String uploadUrl = String.format("%s/storage/v1/object/%s/%s", 
                                            supabaseConfig.getUrl(), bucketName, fileName);
            
            // Prepare headers
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseConfig.getKey());
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-upsert", "true"); // Allow overwriting existing files
            
            // Create request entity
            HttpEntity<byte[]> requestEntity = new HttpEntity<>(fileContent, headers);
            
            // Perform upload
            ResponseEntity<String> response = restTemplate.exchange(
                uploadUrl, HttpMethod.POST, requestEntity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                // Generate and return public URL
                return getPublicUrl(fileName);
            } else {
                throw new RuntimeException("Upload failed with status: " + response.getStatusCode());
            }
            
        } catch (HttpClientErrorException e) {
            logger.error("Client error during upload: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Upload failed: " + e.getMessage(), e);
        } catch (HttpServerErrorException e) {
            logger.error("Server error during upload: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Server error during upload: " + e.getMessage(), e);
        } catch (ResourceAccessException e) {
            logger.error("Network error during upload: {}", e.getMessage());
            throw new RuntimeException("Network error during upload: " + e.getMessage(), e);
        }
    }

    /**
     * Perform the actual upload to Supabase Storage
     */
    private String performUpload(String jsonContent, String fileName) {
        try {
            String bucketName = supabaseConfig.getMobile().getBucket();
            String uploadUrl = String.format("%s/storage/v1/object/%s/%s", 
                                            supabaseConfig.getUrl(), bucketName, fileName);
            
            // Prepare headers
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseConfig.getKey());
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-upsert", "true"); // Allow overwriting existing files
            
            // Convert JSON string to bytes
            byte[] jsonBytes = jsonContent.getBytes(StandardCharsets.UTF_8);
            
            // Create request entity
            HttpEntity<byte[]> requestEntity = new HttpEntity<>(jsonBytes, headers);
            
            // Perform upload
            ResponseEntity<String> response = restTemplate.exchange(
                uploadUrl, HttpMethod.POST, requestEntity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                // Generate and return public URL
                return getPublicUrl(fileName);
            } else {
                throw new RuntimeException("Upload failed with status: " + response.getStatusCode());
            }
            
        } catch (HttpClientErrorException e) {
            logger.error("Client error during upload: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Upload failed: " + e.getMessage(), e);
        } catch (HttpServerErrorException e) {
            logger.error("Server error during upload: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Server error during upload: " + e.getMessage(), e);
        } catch (ResourceAccessException e) {
            logger.error("Network error during upload: {}", e.getMessage());
            throw new RuntimeException("Network error during upload: " + e.getMessage(), e);
        }
    }
    
    /**
     * Generate a timestamped filename for exports
     * Format: mobile-export_YYYY-MM-DD_HH-mm-ss.json
     */
    private String generateTimestampedFileName() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
        return String.format("mobile-export_%s.json", timestamp);
    }
    
    /**
     * Check if Supabase configuration is valid
     */
    public boolean isConfigurationValid() {
        try {
            return supabaseConfig.getUrl() != null && !supabaseConfig.getUrl().trim().isEmpty() &&
                   supabaseConfig.getKey() != null && !supabaseConfig.getKey().trim().isEmpty() &&
                   supabaseConfig.getMobile().getBucket() != null && !supabaseConfig.getMobile().getBucket().trim().isEmpty();
        } catch (Exception e) {
            logger.error("Error checking Supabase configuration", e);
            return false;
        }
    }
    
    /**
     * Test the connection to Supabase Storage
     */
    public boolean testConnection() {
        try {
            if (!isConfigurationValid()) {
                logger.warn("Supabase configuration is invalid");
                return false;
            }
            
            // Try to upload a small test file
            String testContent = "{\"test\": true, \"timestamp\": \"" + LocalDateTime.now() + "\"}";
            String testFileName = "connection-test.json";
            
            SupabaseUploadResult result = uploadJsonFile(testContent, testFileName);
            
            if (result.isSuccess()) {
                logger.info("Supabase connection test successful");
                return true;
            } else {
                logger.warn("Supabase connection test failed: {}", result.getErrorMessage());
                return false;
            }
            
        } catch (Exception e) {
            logger.error("Error testing Supabase connection", e);
            return false;
        }
    }
}
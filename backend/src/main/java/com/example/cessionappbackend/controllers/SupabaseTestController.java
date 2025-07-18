package com.example.cessionappbackend.controllers;

import com.example.cessionappbackend.dto.SupabaseUploadResult;
import com.example.cessionappbackend.services.SupabaseStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Test controller for Supabase integration
 * This controller provides endpoints to test Supabase functionality
 */
@RestController
@RequestMapping("/api/supabase/test")
public class SupabaseTestController {

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    /**
     * Test Supabase configuration
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> testConfiguration() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean isValid = supabaseStorageService.isConfigurationValid();
            response.put("configurationValid", isValid);
            response.put("status", "success");
            
            if (isValid) {
                response.put("message", "Supabase configuration is valid");
            } else {
                response.put("message", "Supabase configuration is invalid - check your properties");
            }
            
        } catch (Exception e) {
            response.put("configurationValid", false);
            response.put("status", "error");
            response.put("message", "Error checking configuration: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Test Supabase connection
     */
    @PostMapping("/connection")
    public ResponseEntity<Map<String, Object>> testConnection() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean connectionOk = supabaseStorageService.testConnection();
            response.put("connectionSuccessful", connectionOk);
            response.put("status", connectionOk ? "success" : "failed");
            response.put("message", connectionOk ? 
                "Successfully connected to Supabase Storage" : 
                "Failed to connect to Supabase Storage");
                
        } catch (Exception e) {
            response.put("connectionSuccessful", false);
            response.put("status", "error");
            response.put("message", "Error testing connection: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Test JSON upload to Supabase
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> testUpload(@RequestBody(required = false) Map<String, Object> testData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Create test JSON content
            String testJson;
            if (testData != null && !testData.isEmpty()) {
                testJson = "{\"test\": true, \"data\": " + testData.toString() + ", \"timestamp\": \"" + 
                          java.time.LocalDateTime.now() + "\"}";
            } else {
                testJson = "{\"test\": true, \"message\": \"Test upload from API\", \"timestamp\": \"" + 
                          java.time.LocalDateTime.now() + "\"}";
            }
            
            // Upload to Supabase
            SupabaseUploadResult result = supabaseStorageService.uploadJsonFile(testJson, null);
            
            response.put("uploadSuccessful", result.isSuccess());
            response.put("fileName", result.getFileName());
            response.put("publicUrl", result.getPublicUrl());
            response.put("uploadTimeMs", result.getUploadTimeMs());
            response.put("status", result.isSuccess() ? "success" : "failed");
            
            if (result.isSuccess()) {
                response.put("message", "Successfully uploaded test file to Supabase Storage");
            } else {
                response.put("message", "Upload failed: " + result.getErrorMessage());
                response.put("errorMessage", result.getErrorMessage());
            }
            
        } catch (Exception e) {
            response.put("uploadSuccessful", false);
            response.put("status", "error");
            response.put("message", "Error during upload: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Generate a public URL for a given filename
     */
    @GetMapping("/url/{fileName}")
    public ResponseEntity<Map<String, Object>> getPublicUrl(@PathVariable String fileName) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String publicUrl = supabaseStorageService.getPublicUrl(fileName);
            response.put("fileName", fileName);
            response.put("publicUrl", publicUrl);
            response.put("status", "success");
            response.put("message", "Public URL generated successfully");
            
        } catch (Exception e) {
            response.put("fileName", fileName);
            response.put("status", "error");
            response.put("message", "Error generating public URL: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }
}
package com.example.cessionappbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing the result of a Supabase upload operation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupabaseUploadResult {
    private boolean success;
    private String fileName;
    private String publicUrl;
    private String errorMessage;
    private long uploadTimeMs;
    
    public static SupabaseUploadResult success(String fileName, String publicUrl, long uploadTimeMs) {
        return new SupabaseUploadResult(true, fileName, publicUrl, null, uploadTimeMs);
    }
    
    public static SupabaseUploadResult failure(String fileName, String errorMessage, long uploadTimeMs) {
        return new SupabaseUploadResult(false, fileName, null, errorMessage, uploadTimeMs);
    }
}
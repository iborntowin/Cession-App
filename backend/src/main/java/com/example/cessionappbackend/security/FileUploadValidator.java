package com.example.cessionappbackend.security;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Component
public class FileUploadValidator {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png", 
        "image/gif",
        "application/pdf"
    );
    
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".jpg", ".jpeg", ".png", ".gif", ".pdf"
    );

    // Known malicious file signatures to block
    private static final List<byte[]> MALICIOUS_SIGNATURES = Arrays.asList(
        new byte[]{(byte) 0x4D, (byte) 0x5A}, // PE executable
        new byte[]{(byte) 0x50, (byte) 0x4B, (byte) 0x03, (byte) 0x04}, // ZIP (potential malware)
        new byte[]{(byte) 0x50, (byte) 0x4B, (byte) 0x05, (byte) 0x06}, // ZIP (potential malware)
        new byte[]{(byte) 0x50, (byte) 0x4B, (byte) 0x07, (byte) 0x08}, // ZIP (potential malware)
        new byte[]{(byte) 0x7F, (byte) 0x45, (byte) 0x4C, (byte) 0x46}, // ELF executable
        new byte[]{(byte) 0xCA, (byte) 0xFE, (byte) 0xBA, (byte) 0xBE}, // Mach-O executable
        new byte[]{(byte) 0xFE, (byte) 0xED, (byte) 0xFA, (byte) 0xCE}, // Mach-O executable
        new byte[]{(byte) 0xFE, (byte) 0xED, (byte) 0xFA, (byte) 0xCF}, // Mach-O executable
        new byte[]{(byte) 0xCE, (byte) 0xFA, (byte) 0xED, (byte) 0xFE}, // Mach-O executable
        new byte[]{(byte) 0xCF, (byte) 0xFA, (byte) 0xED, (byte) 0xFE}  // Mach-O executable
    );

    public void validateFile(MultipartFile file, String documentType) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        validateFileName(file.getOriginalFilename());
        validateFileSize(file);
        validateContentType(file);
        validateFileExtension(file.getOriginalFilename());
        
        try {
            validateFileContent(file);
        } catch (IOException e) {
            throw new IllegalArgumentException("Unable to read file content for validation");
        }
        
        validateDocumentType(documentType);
    }

    private void validateFileName(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new IllegalArgumentException("File name cannot be empty");
        }

        // Prevent path traversal attacks
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new IllegalArgumentException("File name contains invalid characters");
        }

        // Prevent potentially dangerous file names
        if (fileName.toLowerCase().matches(".*\\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|pl|py|sh|php|asp|jsp)$")) {
            throw new IllegalArgumentException("File type not allowed");
        }

        // Ensure reasonable file name length
        if (fileName.length() > 255) {
            throw new IllegalArgumentException("File name is too long");
        }
    }

    private void validateFileSize(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 10MB");
        }
        
        if (file.getSize() == 0) {
            throw new IllegalArgumentException("File is empty");
        }
    }

    private void validateContentType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("File type not allowed. Only JPEG, PNG, GIF, and PDF files are permitted");
        }
    }

    private void validateFileExtension(String fileName) {
        if (fileName == null) {
            throw new IllegalArgumentException("File name is required");
        }

        String extension = getFileExtension(fileName).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("File extension not allowed. Only JPG, PNG, GIF, and PDF files are permitted");
        }
    }

    private void validateFileContent(MultipartFile file) throws IOException {
        byte[] fileContent = file.getBytes();
        
        // Check for malicious file signatures
        for (byte[] signature : MALICIOUS_SIGNATURES) {
            if (fileContent.length >= signature.length) {
                boolean matches = true;
                for (int i = 0; i < signature.length; i++) {
                    if (fileContent[i] != signature[i]) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    throw new IllegalArgumentException("File appears to be an executable or potentially malicious file");
                }
            }
        }

        // Validate that the file content matches the declared content type
        validateContentTypeMatchesContent(file.getContentType(), fileContent);
    }

    private void validateContentTypeMatchesContent(String contentType, byte[] content) {
        if (content.length < 4) {
            throw new IllegalArgumentException("File content is too short to validate");
        }

        switch (contentType.toLowerCase()) {
            case "image/jpeg":
                if (!(content[0] == (byte) 0xFF && content[1] == (byte) 0xD8)) {
                    throw new IllegalArgumentException("File content does not match JPEG format");
                }
                break;
            case "image/png":
                if (!(content[0] == (byte) 0x89 && content[1] == (byte) 0x50 && 
                      content[2] == (byte) 0x4E && content[3] == (byte) 0x47)) {
                    throw new IllegalArgumentException("File content does not match PNG format");
                }
                break;
            case "image/gif":
                if (!(content[0] == (byte) 0x47 && content[1] == (byte) 0x49 && content[2] == (byte) 0x46)) {
                    throw new IllegalArgumentException("File content does not match GIF format");
                }
                break;
            case "application/pdf":
                if (!(content[0] == (byte) 0x25 && content[1] == (byte) 0x50 && 
                      content[2] == (byte) 0x44 && content[3] == (byte) 0x46)) {
                    throw new IllegalArgumentException("File content does not match PDF format");
                }
                break;
        }
    }

    private void validateDocumentType(String documentType) {
        if (documentType == null || documentType.trim().isEmpty()) {
            throw new IllegalArgumentException("Document type is required");
        }

        Set<String> allowedDocumentTypes = Set.of(
            "NATIONAL_ID", "JOB_CARD", "CESSION_CONTRACT", "OTHER"
        );

        if (!allowedDocumentTypes.contains(documentType.toUpperCase())) {
            throw new IllegalArgumentException("Invalid document type");
        }
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf("."));
    }

    public String sanitizeFileName(String fileName) {
        if (fileName == null) {
            return "unnamed_file";
        }
        
        // Remove any path components
        fileName = fileName.replaceAll("[\\\\/]", "");
        
        // Remove or replace potentially problematic characters
        fileName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        
        // Ensure the file name is not too long
        if (fileName.length() > 100) {
            String extension = getFileExtension(fileName);
            String baseName = fileName.substring(0, fileName.lastIndexOf("."));
            if (baseName.length() > 95 - extension.length()) {
                baseName = baseName.substring(0, 95 - extension.length());
            }
            fileName = baseName + extension;
        }
        
        return fileName;
    }
}

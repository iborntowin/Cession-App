package com.example.cessionappbackend.dto;

import com.example.cessionappbackend.entities.ExportStatus;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;
import java.util.UUID;

public class ExportStatusDTO {
    private UUID id;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime exportTimestamp;
    
    private ExportStatus.ExportStatusEnum status;
    private String supabaseUrl;
    private String fileName;
    private Integer recordCount;
    private Integer cessionCount;
    private String errorMessage;
    private Long fileSizeBytes;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    // Default constructor
    public ExportStatusDTO() {}

    // Constructor from entity
    public ExportStatusDTO(ExportStatus exportStatus) {
        this.id = exportStatus.getId();
        this.exportTimestamp = exportStatus.getExportTimestamp();
        this.status = exportStatus.getStatus();
        this.supabaseUrl = exportStatus.getSupabaseUrl();
        this.fileName = exportStatus.getFileName();
        this.recordCount = exportStatus.getRecordCount();
        this.cessionCount = exportStatus.getCessionCount();
        this.errorMessage = exportStatus.getErrorMessage();
        this.fileSizeBytes = exportStatus.getFileSizeBytes();
        this.createdAt = exportStatus.getCreatedAt();
    }

    // Full constructor
    public ExportStatusDTO(UUID id, LocalDateTime exportTimestamp, ExportStatus.ExportStatusEnum status,
                          String supabaseUrl, String fileName, Integer recordCount, Integer cessionCount,
                          String errorMessage, Long fileSizeBytes, LocalDateTime createdAt) {
        this.id = id;
        this.exportTimestamp = exportTimestamp;
        this.status = status;
        this.supabaseUrl = supabaseUrl;
        this.fileName = fileName;
        this.recordCount = recordCount;
        this.cessionCount = cessionCount;
        this.errorMessage = errorMessage;
        this.fileSizeBytes = fileSizeBytes;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public LocalDateTime getExportTimestamp() {
        return exportTimestamp;
    }

    public void setExportTimestamp(LocalDateTime exportTimestamp) {
        this.exportTimestamp = exportTimestamp;
    }

    public ExportStatus.ExportStatusEnum getStatus() {
        return status;
    }

    public void setStatus(ExportStatus.ExportStatusEnum status) {
        this.status = status;
    }

    public String getSupabaseUrl() {
        return supabaseUrl;
    }

    public void setSupabaseUrl(String supabaseUrl) {
        this.supabaseUrl = supabaseUrl;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Integer getRecordCount() {
        return recordCount;
    }

    public void setRecordCount(Integer recordCount) {
        this.recordCount = recordCount;
    }

    public Integer getCessionCount() {
        return cessionCount;
    }

    public void setCessionCount(Integer cessionCount) {
        this.cessionCount = cessionCount;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
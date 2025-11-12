package com.example.cessionappbackend.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "export_status")
public class ExportStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "export_timestamp", nullable = false)
    private LocalDateTime exportTimestamp;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private ExportStatusEnum status;

    @Column(name = "supabase_url", length = 1000)
    private String supabaseUrl;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "record_count")
    private Integer recordCount;

    @Column(name = "cession_count")
    private Integer cessionCount;

    @Column(name = "payment_count")
    private Integer paymentCount;

    @Column(name = "workplace_count")
    private Integer workplaceCount;

    @Column(name = "job_count")
    private Integer jobCount;

    @Column(name = "error_message", length = 2000)
    private String errorMessage;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum ExportStatusEnum {
        SUCCESS,
        FAILED,
        IN_PROGRESS
    }

    // Default constructor
    public ExportStatus() {}

    // Constructor for successful export
    public ExportStatus(LocalDateTime exportTimestamp, String supabaseUrl, String fileName, 
                       Integer recordCount, Integer cessionCount, Integer paymentCount, 
                       Integer workplaceCount, Integer jobCount, Long fileSizeBytes) {
        this.exportTimestamp = exportTimestamp;
        this.status = ExportStatusEnum.SUCCESS;
        this.supabaseUrl = supabaseUrl;
        this.fileName = fileName;
        this.recordCount = recordCount;
        this.cessionCount = cessionCount;
        this.paymentCount = paymentCount;
        this.workplaceCount = workplaceCount;
        this.jobCount = jobCount;
        this.fileSizeBytes = fileSizeBytes;
    }

    // Constructor for failed export
    public ExportStatus(LocalDateTime exportTimestamp, String fileName, String errorMessage) {
        this.exportTimestamp = exportTimestamp;
        this.status = ExportStatusEnum.FAILED;
        this.fileName = fileName;
        this.errorMessage = errorMessage;
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

    public ExportStatusEnum getStatus() {
        return status;
    }

    public void setStatus(ExportStatusEnum status) {
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

    public Integer getPaymentCount() {
        return paymentCount;
    }

    public void setPaymentCount(Integer paymentCount) {
        this.paymentCount = paymentCount;
    }

    public Integer getWorkplaceCount() {
        return workplaceCount;
    }

    public void setWorkplaceCount(Integer workplaceCount) {
        this.workplaceCount = workplaceCount;
    }

    public Integer getJobCount() {
        return jobCount;
    }

    public void setJobCount(Integer jobCount) {
        this.jobCount = jobCount;
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
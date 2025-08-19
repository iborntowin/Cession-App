package com.example.cessionappbackend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import com.example.cessionappbackend.entities.Workplace;

@Data
public class ClientDTO {
    private UUID id;
    private Integer clientNumber;

    @Column(name = "full_name", nullable = false)
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\u0600-\\u06FF\\s'-]+$", message = "Full name can only contain letters, spaces, hyphens, and apostrophes")
    private String fullName;

    @Column(unique = true, nullable = false)
    @NotNull(message = "CIN is required")
    @Pattern(regexp = "^\\d{8}$", message = "CIN must be exactly 8 digits")
    private String cin; // National ID Card number

    @Size(max = 20, message = "Phone number cannot exceed 20 characters")
    @Pattern(regexp = "^[+]?[0-9\\s()-]{8,20}$", message = "Phone number format is invalid")
    @Column(length = 255)
    private String phoneNumber;

    // New fields for linked Workplace and Job
    @NotNull(message = "Workplace is required")
    private UUID workplaceId;
    
    @Size(max = 255, message = "Workplace name cannot exceed 255 characters")
    private String workplaceName;

    @NotNull(message = "Job is required")
    private UUID jobId;
    
    @Size(max = 255, message = "Job name cannot exceed 255 characters")
    private String jobName;

    @NotBlank(message = "Address is required")
    @Size(min = 5, max = 500, message = "Address must be between 5 and 500 characters")
    @Column(length = 500)
    private String address;

    @Column(name = "worker_number", unique = true)
    @NotNull(message = "Worker number is required")
    @Pattern(regexp = "^\\d{10}$", message = "Worker number must be exactly 10 digits")
    private String workerNumber;

    // Email validation if provided
    @Email(message = "Email format is invalid")
    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String email;

    public void setId(UUID id) {
        this.id = id;
    }
    
    // Timestamps are usually handled by the system, not sent in create/update requests
    // private OffsetDateTime createdAt;
    // private OffsetDateTime updatedAt;

    // We might add lists of associated cession/document IDs if needed for responses

    public String getFullName() {
        return fullName;
    }

    public String getCin() {
        return this.cin;
    }

    public void setCin(String cin) {
        this.cin = cin;
    }

    public String getJobName() {
        return jobName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public UUID getWorkplaceId() {
        return workplaceId;
    }

    public void setWorkplaceId(UUID workplaceId) {
        this.workplaceId = workplaceId;
    }

    public String getWorkplaceName() {
        return workplaceName;
    }

    public void setWorkplaceName(String workplaceName) {
        this.workplaceName = workplaceName;
    }

    public UUID getJobId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getWorkerNumber() {
        return workerNumber;
    }
    
    public void setWorkerNumber(String workerNumber) {
        this.workerNumber = workerNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workplace_id")
    private Workplace workplace;

    public Workplace getWorkplace() {
        return workplace;
    }

    public void setWorkplace(Workplace workplace) {
        this.workplace = workplace;
    }
}


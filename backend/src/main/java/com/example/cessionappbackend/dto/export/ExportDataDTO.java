package com.example.cessionappbackend.dto.export;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Main DTO for complete data export
 */
public class ExportDataDTO {
    
    @JsonProperty("metadata")
    private ExportMetadataDTO metadata;
    
    @JsonProperty("clients")
    private List<ExportClientDTO> clients;
    
    @JsonProperty("payments")
    private List<ExportPaymentDTO> payments;
    
    @JsonProperty("workplaces")
    private List<ExportWorkplaceDTO> workplaces;
    
    @JsonProperty("jobs")
    private List<ExportJobDTO> jobs;
    
    public ExportDataDTO() {}
    
    public ExportDataDTO(ExportMetadataDTO metadata, List<ExportClientDTO> clients) {
        this.metadata = metadata;
        this.clients = clients;
        this.payments = List.of();
        this.workplaces = List.of();
        this.jobs = List.of();
    }
    
    public ExportDataDTO(ExportMetadataDTO metadata, List<ExportClientDTO> clients,
                        List<ExportPaymentDTO> payments) {
        this.metadata = metadata;
        this.clients = clients;
        this.payments = payments;
        this.workplaces = List.of();
        this.jobs = List.of();
    }
    
    public ExportDataDTO(ExportMetadataDTO metadata, List<ExportClientDTO> clients,
                        List<ExportPaymentDTO> payments, List<ExportWorkplaceDTO> workplaces,
                        List<ExportJobDTO> jobs) {
        this.metadata = metadata;
        this.clients = clients;
        this.payments = payments;
        this.workplaces = workplaces;
        this.jobs = jobs;
    }
    
    // Getters and Setters
    public ExportMetadataDTO getMetadata() {
        return metadata;
    }
    
    public void setMetadata(ExportMetadataDTO metadata) {
        this.metadata = metadata;
    }
    
    public List<ExportClientDTO> getClients() {
        return clients;
    }
    
    public void setClients(List<ExportClientDTO> clients) {
        this.clients = clients;
    }
    
    public List<ExportPaymentDTO> getPayments() {
        return payments;
    }
    
    public void setPayments(List<ExportPaymentDTO> payments) {
        this.payments = payments;
    }
    
    public List<ExportWorkplaceDTO> getWorkplaces() {
        return workplaces;
    }
    
    public void setWorkplaces(List<ExportWorkplaceDTO> workplaces) {
        this.workplaces = workplaces;
    }
    
    public List<ExportJobDTO> getJobs() {
        return jobs;
    }
    
    public void setJobs(List<ExportJobDTO> jobs) {
        this.jobs = jobs;
    }
}
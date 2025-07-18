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
    
    public ExportDataDTO() {}
    
    public ExportDataDTO(ExportMetadataDTO metadata, List<ExportClientDTO> clients) {
        this.metadata = metadata;
        this.clients = clients;
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
}
package com.example.cessionappbackend.dto.export;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.OffsetDateTime;

/**
 * DTO for export metadata information
 */
public class ExportMetadataDTO {
    
    @JsonProperty("exportTime")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private OffsetDateTime exportTime;
    
    @JsonProperty("version")
    private String version;
    
    @JsonProperty("recordCount")
    private RecordCountDTO recordCount;
    
    public ExportMetadataDTO() {
        this.exportTime = OffsetDateTime.now();
        this.version = "1.0";
    }
    
    public ExportMetadataDTO(OffsetDateTime exportTime, String version, RecordCountDTO recordCount) {
        this.exportTime = exportTime;
        this.version = version;
        this.recordCount = recordCount;
    }
    
    // Getters and Setters
    public OffsetDateTime getExportTime() {
        return exportTime;
    }
    
    public void setExportTime(OffsetDateTime exportTime) {
        this.exportTime = exportTime;
    }
    
    public String getVersion() {
        return version;
    }
    
    public void setVersion(String version) {
        this.version = version;
    }
    
    public RecordCountDTO getRecordCount() {
        return recordCount;
    }
    
    public void setRecordCount(RecordCountDTO recordCount) {
        this.recordCount = recordCount;
    }
    
    /**
     * Inner class for record count information
     */
    public static class RecordCountDTO {
        @JsonProperty("clients")
        private int clients;
        
        @JsonProperty("cessions")
        private int cessions;
        
        public RecordCountDTO() {}
        
        public RecordCountDTO(int clients, int cessions) {
            this.clients = clients;
            this.cessions = cessions;
        }
        
        public int getClients() {
            return clients;
        }
        
        public void setClients(int clients) {
            this.clients = clients;
        }
        
        public int getCessions() {
            return cessions;
        }
        
        public void setCessions(int cessions) {
            this.cessions = cessions;
        }
    }
}
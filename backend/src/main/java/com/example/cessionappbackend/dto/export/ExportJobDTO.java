package com.example.cessionappbackend.dto.export;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * DTO for job information in exports
 */
public class ExportJobDTO {
    
    @JsonProperty("id")
    private UUID id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("workplaceId")
    private UUID workplaceId;
    
    public ExportJobDTO() {}
    
    public ExportJobDTO(UUID id, String name) {
        this.id = id;
        this.name = name;
    }
    
    public ExportJobDTO(UUID id, String name, UUID workplaceId) {
        this.id = id;
        this.name = name;
        this.workplaceId = workplaceId;
    }
    
    // Getters and Setters
    public UUID getId() {
        return id;
    }
    
    public void setId(UUID id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public UUID getWorkplaceId() {
        return workplaceId;
    }
    
    public void setWorkplaceId(UUID workplaceId) {
        this.workplaceId = workplaceId;
    }
}
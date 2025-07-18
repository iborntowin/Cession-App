package com.example.cessionappbackend.dto.export;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * DTO for workplace information in exports
 */
public class ExportWorkplaceDTO {
    
    @JsonProperty("id")
    private UUID id;
    
    @JsonProperty("name")
    private String name;
    
    public ExportWorkplaceDTO() {}
    
    public ExportWorkplaceDTO(UUID id, String name) {
        this.id = id;
        this.name = name;
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
}
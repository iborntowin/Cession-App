package com.example.cessionappbackend.dto.export;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.UUID;

/**
 * DTO for client information in exports
 */
public class ExportClientDTO {
    
    @JsonProperty("id")
    private UUID id;
    
    @JsonProperty("clientNumber")
    private Integer clientNumber;
    
    @JsonProperty("fullName")
    private String fullName;
    
    @JsonProperty("cin")
    private String cin;
    
    @JsonProperty("phoneNumber")
    private String phoneNumber;
    
    @JsonProperty("address")
    private String address;
    
    @JsonProperty("workerNumber")
    private String workerNumber;
    
    @JsonProperty("workplace")
    private ExportWorkplaceDTO workplace;
    
    @JsonProperty("job")
    private ExportJobDTO job;
    
    @JsonProperty("cessions")
    private List<ExportCessionDTO> cessions;
    
    public ExportClientDTO() {}
    
    public ExportClientDTO(UUID id, Integer clientNumber, String fullName, String cin,
                          String phoneNumber, String address, String workerNumber,
                          ExportWorkplaceDTO workplace, ExportJobDTO job,
                          List<ExportCessionDTO> cessions) {
        this.id = id;
        this.clientNumber = clientNumber;
        this.fullName = fullName;
        this.cin = cin;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.workerNumber = workerNumber;
        this.workplace = workplace;
        this.job = job;
        this.cessions = cessions;
    }
    
    // Getters and Setters
    public UUID getId() {
        return id;
    }
    
    public void setId(UUID id) {
        this.id = id;
    }
    
    public Integer getClientNumber() {
        return clientNumber;
    }
    
    public void setClientNumber(Integer clientNumber) {
        this.clientNumber = clientNumber;
    }
    
    public String getFullName() {
        return fullName;
    }
    
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }
    
    public String getCin() {
        return cin;
    }
    
    public void setCin(String cin) {
        this.cin = cin;
    }
    
    public String getPhoneNumber() {
        return phoneNumber;
    }
    
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
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
    
    public ExportWorkplaceDTO getWorkplace() {
        return workplace;
    }
    
    public void setWorkplace(ExportWorkplaceDTO workplace) {
        this.workplace = workplace;
    }
    
    public ExportJobDTO getJob() {
        return job;
    }
    
    public void setJob(ExportJobDTO job) {
        this.job = job;
    }
    
    public List<ExportCessionDTO> getCessions() {
        return cessions;
    }
    
    public void setCessions(List<ExportCessionDTO> cessions) {
        this.cessions = cessions;
    }
}
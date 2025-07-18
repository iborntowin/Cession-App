package com.example.cessionappbackend.dto.export;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for cession information in exports
 */
public class ExportCessionDTO {
    
    @JsonProperty("id")
    private UUID id;
    
    @JsonProperty("monthlyPayment")
    private BigDecimal monthlyPayment;
    
    @JsonProperty("startDate")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate startDate;
    
    @JsonProperty("endDate")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate endDate;
    
    @JsonProperty("expectedPayoffDate")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate expectedPayoffDate;
    
    @JsonProperty("remainingBalance")
    private BigDecimal remainingBalance;
    
    @JsonProperty("totalLoanAmount")
    private BigDecimal totalLoanAmount;
    
    @JsonProperty("currentProgress")
    private BigDecimal currentProgress;
    
    @JsonProperty("monthsRemaining")
    private Integer monthsRemaining;
    
    @JsonProperty("bankOrAgency")
    private String bankOrAgency;
    
    @JsonProperty("status")
    private String status;
    
    public ExportCessionDTO() {}
    
    public ExportCessionDTO(UUID id, BigDecimal monthlyPayment, LocalDate startDate, 
                           LocalDate endDate, LocalDate expectedPayoffDate, 
                           BigDecimal remainingBalance, BigDecimal totalLoanAmount,
                           BigDecimal currentProgress, Integer monthsRemaining,
                           String bankOrAgency, String status) {
        this.id = id;
        this.monthlyPayment = monthlyPayment;
        this.startDate = startDate;
        this.endDate = endDate;
        this.expectedPayoffDate = expectedPayoffDate;
        this.remainingBalance = remainingBalance;
        this.totalLoanAmount = totalLoanAmount;
        this.currentProgress = currentProgress;
        this.monthsRemaining = monthsRemaining;
        this.bankOrAgency = bankOrAgency;
        this.status = status;
    }
    
    // Getters and Setters
    public UUID getId() {
        return id;
    }
    
    public void setId(UUID id) {
        this.id = id;
    }
    
    public BigDecimal getMonthlyPayment() {
        return monthlyPayment;
    }
    
    public void setMonthlyPayment(BigDecimal monthlyPayment) {
        this.monthlyPayment = monthlyPayment;
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
    
    public LocalDate getExpectedPayoffDate() {
        return expectedPayoffDate;
    }
    
    public void setExpectedPayoffDate(LocalDate expectedPayoffDate) {
        this.expectedPayoffDate = expectedPayoffDate;
    }
    
    public BigDecimal getRemainingBalance() {
        return remainingBalance;
    }
    
    public void setRemainingBalance(BigDecimal remainingBalance) {
        this.remainingBalance = remainingBalance;
    }
    
    public BigDecimal getTotalLoanAmount() {
        return totalLoanAmount;
    }
    
    public void setTotalLoanAmount(BigDecimal totalLoanAmount) {
        this.totalLoanAmount = totalLoanAmount;
    }
    
    public BigDecimal getCurrentProgress() {
        return currentProgress;
    }
    
    public void setCurrentProgress(BigDecimal currentProgress) {
        this.currentProgress = currentProgress;
    }
    
    public Integer getMonthsRemaining() {
        return monthsRemaining;
    }
    
    public void setMonthsRemaining(Integer monthsRemaining) {
        this.monthsRemaining = monthsRemaining;
    }
    
    public String getBankOrAgency() {
        return bankOrAgency;
    }
    
    public void setBankOrAgency(String bankOrAgency) {
        this.bankOrAgency = bankOrAgency;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
}
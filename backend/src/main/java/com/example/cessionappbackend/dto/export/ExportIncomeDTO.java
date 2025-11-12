package com.example.cessionappbackend.dto.export;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for income information in exports
 */
public class ExportIncomeDTO {

    @JsonProperty("id")
    private UUID id;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("source")
    private String source;

    @JsonProperty("date")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate date;

    @JsonProperty("userId")
    private UUID userId;

    @JsonProperty("description")
    private String description;

    @JsonProperty("createdAt")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public ExportIncomeDTO() {}

    public ExportIncomeDTO(UUID id, BigDecimal amount, String source, LocalDate date,
                          UUID userId, String description, LocalDateTime createdAt) {
        this.id = id;
        this.amount = amount;
        this.source = source;
        this.date = date;
        this.userId = userId;
        this.description = description;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
package com.example.cessionappbackend.dto.export;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO for payment information in exports
 */
public class ExportPaymentDTO {

    @JsonProperty("id")
    private UUID id;

    @JsonProperty("cessionId")
    private UUID cessionId;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("paymentDate")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate paymentDate;

    @JsonProperty("notes")
    private String notes;

    @JsonProperty("createdAt")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
    private OffsetDateTime createdAt;

    public ExportPaymentDTO() {}

    public ExportPaymentDTO(UUID id, UUID cessionId, BigDecimal amount, LocalDate paymentDate,
                           String notes, OffsetDateTime createdAt) {
        this.id = id;
        this.cessionId = cessionId;
        this.amount = amount;
        this.paymentDate = paymentDate;
        this.notes = notes;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCessionId() {
        return cessionId;
    }

    public void setCessionId(UUID cessionId) {
        this.cessionId = cessionId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
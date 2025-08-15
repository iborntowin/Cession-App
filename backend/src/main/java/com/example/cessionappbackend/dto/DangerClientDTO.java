package com.example.cessionappbackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DangerClientDTO {
    private UUID clientId;
    private String clientName;
    private String clientCin;
    private UUID cessionId;
    private LocalDate startDate;
    private BigDecimal monthlyAmount;
    private Integer monthsTotal;
    private Integer dueMonths;
    private Integer paidMonths;
    private Integer missedMonths;
    private LocalDate lastPaymentDate;
    private String severity; // "warning", "danger", "critical"
    private BigDecimal totalPaidAmount;
    private BigDecimal totalMissedAmount;
    private String status;
}
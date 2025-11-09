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
    private String clientWorkerNumber; // Added for CSV export
    private String clientWorkplace; // Added for CSV export and filtering
    private UUID clientJobId; // Added for job filtering and display
    private String clientJobName; // Added for job filtering and display
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
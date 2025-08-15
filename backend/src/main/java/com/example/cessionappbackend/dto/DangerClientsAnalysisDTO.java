package com.example.cessionappbackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DangerClientsAnalysisDTO {
    private Integer totalDangerClients;
    private Integer totalOverdueCessions;
    private Double averageMissedMonths;
    private BigDecimal totalMissedAmount;
    private List<DangerClientDTO> dangerClients;
    
    // Breakdown by severity
    private Integer warningCount;
    private Integer dangerCount;
    private Integer criticalCount;
}
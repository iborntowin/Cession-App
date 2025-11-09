package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.PaymentDTO;
import com.example.cessionappbackend.dto.DangerClientDTO;
import com.example.cessionappbackend.dto.DangerClientsAnalysisDTO;
import com.example.cessionappbackend.entities.Cession;
import com.example.cessionappbackend.entities.Payment;
import com.example.cessionappbackend.events.DataChangeEvent;
import com.example.cessionappbackend.repositories.CessionRepository;
import com.example.cessionappbackend.repositories.PaymentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final CessionRepository cessionRepository;
    private final CessionCalculationService calculationService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public PaymentDTO createPayment(PaymentDTO paymentDTO) {
        Cession cession = cessionRepository.findById(paymentDTO.getCessionId())
                .orElseThrow(() -> new EntityNotFoundException("Cession not found"));

        Payment payment = new Payment();
        payment.setCession(cession);
        payment.setAmount(paymentDTO.getAmount());
        payment.setPaymentDate(paymentDTO.getPaymentDate());
        payment.setNotes(paymentDTO.getNotes());

        payment = paymentRepository.save(payment);
        
        // Update cession calculations after payment
        calculationService.recalculateCessionAfterPayment(cession);
        cessionRepository.save(cession);

        // Publish data change event for payment creation (affects cession data)
        eventPublisher.publishEvent(new DataChangeEvent(this, "Payment", "CREATE", payment.getId()));

        return convertToDTO(payment, cession);
    }

    @Transactional(readOnly = true)
    public List<PaymentDTO> getCessionPayments(UUID cessionId) {
        Cession cession = cessionRepository.findById(cessionId)
                .orElseThrow(() -> new EntityNotFoundException("Cession not found"));

        return paymentRepository.findByCessionIdOrderByPaymentDateDesc(cessionId).stream()
                .map(payment -> convertToDTO(payment, cession))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentDTO> getPaymentsByDateRange(UUID cessionId, LocalDate startDate, LocalDate endDate) {
        Cession cession = cessionRepository.findById(cessionId)
                .orElseThrow(() -> new EntityNotFoundException("Cession not found"));

        return paymentRepository.findPaymentsByCessionAndDateRange(cessionId, startDate, endDate).stream()
                .map(payment -> convertToDTO(payment, cession))
                .collect(Collectors.toList());
    }

    public List<PaymentDTO> getAllPayments() {
        List<Payment> payments = paymentRepository.findAll();
        return payments.stream()
            .map(payment -> {
                PaymentDTO dto = convertToDTO(payment);
                Optional<Cession> cession = cessionRepository.findById(payment.getCession().getId());
                cession.ifPresent(c -> {
                    dto.setCessionId(c.getId());
                    dto.setCessionClientName(c.getClient().getFullName());
                });
                return dto;
            })
            .collect(Collectors.toList());
    }

    private PaymentDTO convertToDTO(Payment payment, Cession cession) {
        PaymentDTO dto = new PaymentDTO();
        dto.setId(payment.getId());
        dto.setCessionId(cession.getId());
        dto.setCessionClientName(cession.getClient().getFullName());
        dto.setAmount(payment.getAmount());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setNotes(payment.getNotes());
        
        // Calculate remaining balance and progress
        BigDecimal totalPaid = paymentRepository.getTotalPaymentsByCession(cession.getId());
        BigDecimal remainingBalance = cession.getTotalLoanAmount().subtract(totalPaid);
        BigDecimal progress = totalPaid.multiply(new BigDecimal("100"))
                .divide(cession.getTotalLoanAmount(), 2, RoundingMode.HALF_UP);
        
        dto.setRemainingBalanceAfterPayment(remainingBalance);
        dto.setUpdatedProgress(progress);
        
        return dto;
    }

    private PaymentDTO convertToDTO(Payment payment) {
        PaymentDTO dto = new PaymentDTO();
        dto.setId(payment.getId());
        dto.setAmount(payment.getAmount());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setNotes(payment.getNotes());
        return dto;
    }

    @Transactional(readOnly = true)
    public DangerClientsAnalysisDTO getDangerClientsAnalysis(Integer thresholdMonths, Integer unstartedDaysThreshold) {
        if (thresholdMonths == null) {
            thresholdMonths = 1; // Default threshold changed to 1 to include warnings
        }
        
        if (unstartedDaysThreshold == null) {
            unstartedDaysThreshold = 1; // Default minimum 1 day
        }

        List<Cession> activeCessions = cessionRepository.findByStatusIn(List.of("ACTIVE", "active", "in_progress"));
        List<DangerClientDTO> dangerClients = new ArrayList<>();
        List<DangerClientDTO> unstartedClients = new ArrayList<>();
        
        // FIXED: Use UTC timezone consistently to avoid dev/prod differences
        LocalDate now = LocalDate.now(java.time.ZoneOffset.UTC);

        int warningCount = 0;
        int dangerCount = 0;
        int criticalCount = 0;
        BigDecimal totalMissedAmount = BigDecimal.ZERO;
        double totalMissedMonths = 0;

        for (Cession cession : activeCessions) {
            // Skip if monthly amount is null or zero
            if (cession.getMonthlyPayment() == null || cession.getMonthlyPayment().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            // FIXED: Ensure consistent date handling - convert to start of month for accurate comparison
            LocalDate cessionStartDate = cession.getStartDate();
            if (cessionStartDate == null) {
                continue; // Skip cessions without start date
            }
            
            // Calculate days since cession start
            long daysSinceStart = ChronoUnit.DAYS.between(cessionStartDate, now);
            
            // Get total paid amount for this cession
            BigDecimal totalPaid = paymentRepository.getTotalPaymentsByCession(cession.getId());
            if (totalPaid == null) {
                totalPaid = BigDecimal.ZERO;
            }
            
            // Check if this is an unstarted client (using dynamic threshold, no payments)
            if (daysSinceStart >= unstartedDaysThreshold && totalPaid.compareTo(BigDecimal.ZERO) == 0) {
                // Get last payment date (should be null for unstarted)
                LocalDate lastPaymentDate = paymentRepository.findLastPaymentDateByCession(cession.getId());
                
                // Calculate expected months and missed months
                LocalDate normalizedStartDate = cessionStartDate.withDayOfMonth(1);
                LocalDate normalizedNow = now.withDayOfMonth(1);
                long monthsElapsed = ChronoUnit.MONTHS.between(normalizedStartDate, normalizedNow);
                int dueMonths = (int) Math.max(0, monthsElapsed);
                
                Integer monthsTotal = null;
                if (cession.getTotalLoanAmount() != null && cession.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    monthsTotal = cession.getTotalLoanAmount().divide(cession.getMonthlyPayment(), 0, RoundingMode.UP).intValue();
                    dueMonths = Math.min(dueMonths, monthsTotal);
                }
                
                BigDecimal missedAmount = cession.getMonthlyPayment().multiply(new BigDecimal(dueMonths));
                
                DangerClientDTO unstartedClient = new DangerClientDTO();
                unstartedClient.setClientId(cession.getClient().getId());
                unstartedClient.setClientName(cession.getClient().getFullName());
                unstartedClient.setClientCin(cession.getClient().getCin());
                unstartedClient.setClientWorkerNumber(cession.getClient().getWorkerNumber());
                unstartedClient.setClientWorkplace(cession.getClient().getWorkplace() != null ? cession.getClient().getWorkplace().getName() : null);
                unstartedClient.setClientJobId(cession.getClient().getJob() != null ? cession.getClient().getJob().getId() : null);
                unstartedClient.setClientJobName(cession.getClient().getJob() != null ? cession.getClient().getJob().getName() : null);
                unstartedClient.setCessionId(cession.getId());
                unstartedClient.setStartDate(cession.getStartDate());
                unstartedClient.setMonthlyAmount(cession.getMonthlyPayment());
                unstartedClient.setMonthsTotal(monthsTotal);
                unstartedClient.setDueMonths(dueMonths);
                unstartedClient.setPaidMonths(0);
                unstartedClient.setMissedMonths(dueMonths);
                unstartedClient.setLastPaymentDate(lastPaymentDate);
                unstartedClient.setSeverity("unstarted");
                unstartedClient.setTotalPaidAmount(BigDecimal.ZERO);
                unstartedClient.setTotalMissedAmount(missedAmount);
                unstartedClient.setStatus(cession.getStatus());
                
                unstartedClients.add(unstartedClient);
                continue; // Skip adding to danger clients list
            }
            
            // Normalize dates to first day of month for consistent month calculation
            LocalDate normalizedStartDate = cessionStartDate.withDayOfMonth(1);
            LocalDate normalizedNow = now.withDayOfMonth(1);
            
            // Calculate due months (months elapsed since start_date, capped by months_total if available)
            // FIXED: Use more robust month calculation that handles edge cases consistently
            long monthsElapsed = ChronoUnit.MONTHS.between(normalizedStartDate, normalizedNow);
            
            // FIXED: Only consider positive elapsed months (cessions that have actually started)
            int dueMonths = (int) Math.max(0, monthsElapsed);
            
            // If we have a total loan amount, calculate expected total months
            Integer monthsTotal = null;
            if (cession.getTotalLoanAmount() != null && cession.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                monthsTotal = cession.getTotalLoanAmount().divide(cession.getMonthlyPayment(), 0, RoundingMode.UP).intValue();
                dueMonths = Math.min(dueMonths, monthsTotal);
            }

            // Calculate paid months (floor of total paid / monthly amount)
            int paidMonths = totalPaid.divide(cession.getMonthlyPayment(), 0, RoundingMode.DOWN).intValue();

            // Calculate missed months
            int missedMonths = Math.max(0, dueMonths - paidMonths);

            // Debug logging can be enabled by uncommenting the line below
            // System.out.println(String.format("DEBUG - Cession %s: startDate=%s, monthsElapsed=%d, dueMonths=%d, missedMonths=%d", cession.getId(), cessionStartDate, monthsElapsed, dueMonths, missedMonths));

            // Include if missed months >= threshold (now includes 1-month warnings)
            if (missedMonths >= thresholdMonths) {
                // Get last payment date
                LocalDate lastPaymentDate = paymentRepository.findLastPaymentDateByCession(cession.getId());

                // Determine severity based on missed months
                String severity;
                if (missedMonths >= 3) {
                    severity = "critical";
                    criticalCount++;
                } else if (missedMonths >= 2) {
                    severity = "danger";
                    dangerCount++;
                } else if (missedMonths == 1) {
                    severity = "warning";
                    warningCount++;
                } else {
                    // This shouldn't happen given our threshold check, but safety fallback
                    severity = "warning";
                    warningCount++;
                }

                // Calculate missed amount
                BigDecimal missedAmount = cession.getMonthlyPayment().multiply(new BigDecimal(missedMonths));
                totalMissedAmount = totalMissedAmount.add(missedAmount);
                totalMissedMonths += missedMonths;

                DangerClientDTO dangerClient = new DangerClientDTO();
                dangerClient.setClientId(cession.getClient().getId());
                dangerClient.setClientName(cession.getClient().getFullName());
                dangerClient.setClientCin(cession.getClient().getCin());
                dangerClient.setClientWorkerNumber(cession.getClient().getWorkerNumber());
                dangerClient.setClientWorkplace(cession.getClient().getWorkplace() != null ? cession.getClient().getWorkplace().getName() : null);
                dangerClient.setClientJobId(cession.getClient().getJob() != null ? cession.getClient().getJob().getId() : null);
                dangerClient.setClientJobName(cession.getClient().getJob() != null ? cession.getClient().getJob().getName() : null);
                dangerClient.setCessionId(cession.getId());
                dangerClient.setStartDate(cession.getStartDate());
                dangerClient.setMonthlyAmount(cession.getMonthlyPayment());
                dangerClient.setMonthsTotal(monthsTotal);
                dangerClient.setDueMonths(dueMonths);
                dangerClient.setPaidMonths(paidMonths);
                dangerClient.setMissedMonths(missedMonths);
                dangerClient.setLastPaymentDate(lastPaymentDate);
                dangerClient.setSeverity(severity);
                dangerClient.setTotalPaidAmount(totalPaid);
                dangerClient.setTotalMissedAmount(missedAmount);
                dangerClient.setStatus(cession.getStatus());

                dangerClients.add(dangerClient);
            }
        }

        // Sort by severity (critical first), then by missed months desc, then by last payment date asc
        dangerClients.sort((a, b) -> {
            // First by severity priority
            int severityCompare = getSeverityPriority(b.getSeverity()) - getSeverityPriority(a.getSeverity());
            if (severityCompare != 0) return severityCompare;
            
            // Then by missed months descending
            int missedCompare = b.getMissedMonths().compareTo(a.getMissedMonths());
            if (missedCompare != 0) return missedCompare;
            
            // Finally by last payment date ascending (null dates last)
            if (a.getLastPaymentDate() == null && b.getLastPaymentDate() == null) return 0;
            if (a.getLastPaymentDate() == null) return 1;
            if (b.getLastPaymentDate() == null) return -1;
            return a.getLastPaymentDate().compareTo(b.getLastPaymentDate());
        });
        
        // Sort unstarted clients by start date (oldest first)
        unstartedClients.sort((a, b) -> {
            if (a.getStartDate() == null && b.getStartDate() == null) return 0;
            if (a.getStartDate() == null) return 1;
            if (b.getStartDate() == null) return -1;
            return a.getStartDate().compareTo(b.getStartDate());
        });

        // Calculate average missed months
        double averageMissedMonths = dangerClients.isEmpty() ? 0 : totalMissedMonths / dangerClients.size();

        DangerClientsAnalysisDTO analysis = new DangerClientsAnalysisDTO();
        analysis.setTotalDangerClients(dangerClients.size());
        analysis.setTotalOverdueCessions(dangerClients.size());
        analysis.setAverageMissedMonths(averageMissedMonths);
        analysis.setTotalMissedAmount(totalMissedAmount);
        analysis.setDangerClients(dangerClients);
        analysis.setWarningCount(warningCount);
        analysis.setDangerCount(dangerCount);
        analysis.setCriticalCount(criticalCount);
        analysis.setUnstartedClients(unstartedClients);
        analysis.setUnstartedClientsCount(unstartedClients.size());

        return analysis;
    }

    // Overload method for backward compatibility
    @Transactional(readOnly = true)
    public DangerClientsAnalysisDTO getDangerClientsAnalysis(Integer thresholdMonths) {
        return getDangerClientsAnalysis(thresholdMonths, 1); // Default to 1 day
    }

    private int getSeverityPriority(String severity) {
        switch (severity.toLowerCase()) {
            case "critical": return 3;
            case "danger": return 2;
            case "warning": return 1;
            default: return 0;
        }
    }
}
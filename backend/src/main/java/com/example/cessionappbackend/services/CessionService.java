package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.CessionDTO;
import com.example.cessionappbackend.entities.Cession;
import com.example.cessionappbackend.entities.Client;
import com.example.cessionappbackend.entities.Document;
import com.example.cessionappbackend.events.DataChangeEvent;
import com.example.cessionappbackend.repositories.CessionRepository;
import com.example.cessionappbackend.repositories.ClientRepository;
import com.example.cessionappbackend.repositories.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CessionService {

    private final CessionRepository cessionRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private DocumentRepository documentRepository;
    
    @Autowired
    private CessionCalculationService calculationService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    private static final Logger logger = LoggerFactory.getLogger(CessionService.class);

    @Autowired
    public CessionService(CessionRepository cessionRepository) {
        this.cessionRepository = cessionRepository;
    }

    @Transactional(readOnly = true)
    public List<CessionDTO> getAllCessions() {
        return cessionRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CessionDTO getCessionById(UUID id) {
        Cession cession = cessionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cession not found"));
        return convertToDTO(cession);
    }

    @Transactional(readOnly = true)
    public List<CessionDTO> getCessionsByClientFiltered(UUID clientId, String status, String completionStatus) {
        logger.debug("CessionService.getCessionsByClientFiltered called with clientId: {}, status: {}, completionStatus: {}", clientId, status, completionStatus);
        List<Cession> cessions = cessionRepository.findByClientId(clientId);
        logger.debug("Found {} cessions in repository for clientId: {}", cessions.size(), clientId);

        // Apply status filtering
        if (status != null && !status.equalsIgnoreCase("all")) {
            cessions = cessions.stream()
                .filter(cession -> cession.getStatus() != null && cession.getStatus().equalsIgnoreCase(status))
                .collect(Collectors.toList());
        }

        // Apply completion status filtering
        if (completionStatus != null && !completionStatus.equalsIgnoreCase("all")) {
            cessions = cessions.stream()
                .filter(cession -> {
                    boolean isCompleted = cession.getStatus() != null &&
                        (cession.getStatus().equalsIgnoreCase("FINISHED") ||
                         cession.getStatus().equalsIgnoreCase("COMPLETED"));

                    if (completionStatus.equalsIgnoreCase("completed")) {
                        return isCompleted;
                    } else if (completionStatus.equalsIgnoreCase("incomplete")) {
                        return !isCompleted;
                    }
                    return true;
                })
                .collect(Collectors.toList());
        }

        List<CessionDTO> result = cessions.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        logger.debug("Converted {} filtered cessions to DTOs for clientId: {}", result.size(), clientId);
        return result;
    }

    @Transactional(readOnly = true)
    public List<CessionDTO> getCessionsByClientId(UUID clientId) {
        logger.debug("CessionService.getCessionsByClientId called with clientId: {}", clientId);
        List<Cession> cessions = cessionRepository.findByClientId(clientId);
        logger.debug("Found {} cessions for clientId: {}", cessions.size(), clientId);
        return cessions.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CessionDTO> searchCessions(String name, String job, String clientNumber, String clientCin, String phoneNumber, String workplace, String address, String workerNumber, String completionStatus) {
        try {
            logger.debug("Searching cessions with criteria - name: {}, job: {}, clientNumber: {}, clientCin: {}, phoneNumber: {}, workplace: {}, address: {}, workerNumber: {}, completionStatus: {}", 
                    name, job, clientNumber, clientCin, phoneNumber, workplace, address, workerNumber, completionStatus);

            // Validate client number if provided
            if (clientNumber != null && !clientNumber.matches("\\d+")) {
                throw new IllegalArgumentException("Client number must be numeric");
            }

            // Validate and normalize name if provided
            if (name != null) {
                name = name.trim();
                if (name.isEmpty()) {
                    name = null;
                }
            }

            // Validate and normalize job if provided
            if (job != null) {
                job = job.trim();
                if (job.isEmpty()) {
                    job = null;
                }
            }

            // Validate CIN if provided
            if (clientCin != null && !clientCin.matches("\\d{8}")) {
                throw new IllegalArgumentException("CIN must be 8 digits");
            }

            // Validate worker number if provided
            if (workerNumber != null && !workerNumber.matches("\\d{10}")) {
                throw new IllegalArgumentException("Worker number must be 10 digits");
            }

            // Validate and normalize phone number if provided
            if (phoneNumber != null) {
                phoneNumber = phoneNumber.trim();
                if (phoneNumber.isEmpty()) {
                    phoneNumber = null;
                }
            }

            // Validate and normalize workplace if provided
            if (workplace != null) {
                workplace = workplace.trim();
                if (workplace.isEmpty()) {
                    workplace = null;
                }
            }

            // Validate and normalize address if provided
            if (address != null) {
                address = address.trim();
                if (address.isEmpty()) {
                    address = null;
                }
            }

            // Validate completion status
            if (completionStatus != null) {
                completionStatus = completionStatus.trim().toLowerCase();
                if (!completionStatus.equals("completed") && !completionStatus.equals("incomplete") && !completionStatus.equals("all")) {
                    throw new IllegalArgumentException("Completion status must be 'completed', 'incomplete', or 'all'");
                }
            }

            // Create final variable for lambda use
            final String finalCompletionStatus = completionStatus;

            List<Cession> cessions = cessionRepository.searchCessions(
                name,
                job,
                clientNumber != null && !clientNumber.isEmpty() ? Integer.valueOf(clientNumber) : null,
                clientCin,
                phoneNumber,
                workplace,
                address,
                workerNumber
            );

            // Apply completion status filtering after repository query
            if (finalCompletionStatus != null && !finalCompletionStatus.equals("all")) {
                cessions = cessions.stream()
                    .filter(cession -> {
                        boolean isCompleted = cession.getStatus() != null &&
                            (cession.getStatus().equalsIgnoreCase("FINISHED") ||
                             cession.getStatus().equalsIgnoreCase("COMPLETED"));

                        if (finalCompletionStatus.equals("completed")) {
                            return isCompleted;
                        } else if (finalCompletionStatus.equals("incomplete")) {
                            return !isCompleted;
                        }
                        return true;
                    })
                    .collect(Collectors.toList());
            }

            logger.debug("Found {} cessions matching search criteria", cessions.size());

            return cessions.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid search parameters: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error searching cessions: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to search cessions: " + e.getMessage(), e);
        }
    }

    @Transactional
    public CessionDTO createCession(CessionDTO cessionDTO) {
        // Search for client by number, CIN, or name
        Client client = null;
        if (cessionDTO.getClientNumber() != null && !cessionDTO.getClientNumber().isEmpty()) {
            client = clientRepository.findByClientNumber(Integer.valueOf(cessionDTO.getClientNumber()))
                .orElseThrow(() -> new RuntimeException("Client not found with number: " + cessionDTO.getClientNumber()));
        } else if (cessionDTO.getClientCin() != null && !cessionDTO.getClientCin().isEmpty()) {
            client = clientRepository.findByCin(cessionDTO.getClientCin())
                .orElseThrow(() -> new RuntimeException("Client not found with CIN: " + cessionDTO.getClientCin()));
        } else if (cessionDTO.getClientName() != null) {
            client = clientRepository.findByFullName(cessionDTO.getClientName())
                .orElseThrow(() -> new RuntimeException("Client not found with name: " + cessionDTO.getClientName()));
        } else {
            throw new RuntimeException("Client identification (number, CIN, or name) is required");
        }

        Cession cession = new Cession();
        cession.setClient(client);
        
        // Set monthly payment from DTO
        cession.setMonthlyPayment(cessionDTO.getMonthlyPayment());
        
        // Calculate total loan amount (monthly payment × 18)
        cession.setTotalLoanAmount(cessionDTO.getMonthlyPayment().multiply(new BigDecimal("18")));
        
        // Set default status as ACTIVE
        cession.setStatus("ACTIVE");
        
        // Use provided start date or default to today
        cession.setStartDate(cessionDTO.getStartDate() != null ? cessionDTO.getStartDate() : LocalDate.now());
        
        // Calculate end date (18 months from start)
        LocalDate startDate = cession.getStartDate();
        cession.setEndDate(startDate != null ? startDate.plusMonths(18) : LocalDate.now().plusMonths(18));
        
        // Set bank or agency
        if (cessionDTO.getBankOrAgency() == null || cessionDTO.getBankOrAgency().trim().isEmpty()) {
            throw new RuntimeException("Bank or agency name is required");
        }
        cession.setBankOrAgency(cessionDTO.getBankOrAgency().trim());
        
        // Set PDF generation fields
        cession.setItemDescription(cessionDTO.getItemDescription());
        cession.setPersonalAddress(cessionDTO.getPersonalAddress());
        
        // Apply calculations before saving
        Cession savedCession = calculationService.calculateAndUpdateCessionFields(cession);
        
        // Publish data change event
        eventPublisher.publishEvent(new DataChangeEvent(this, "Cession", "CREATE", savedCession.getId()));
        
        return convertToDTO(savedCession);
    }

    @Transactional
    public Optional<CessionDTO> updateCession(UUID id, CessionDTO cessionDTO) {
        Optional<Cession> cessionOpt = cessionRepository.findById(id);
        if (cessionOpt.isEmpty()) {
            return Optional.empty();
        }

        Cession cession = cessionOpt.get();
        updateCessionFromDTO(cession, cessionDTO);
        
        // Apply calculations before saving
        Cession updatedCession = calculationService.calculateAndUpdateCessionFields(cession);
        
        // Publish data change event
        eventPublisher.publishEvent(new DataChangeEvent(this, "Cession", "UPDATE", updatedCession.getId()));
        
        return Optional.of(convertToDTO(updatedCession));
    }

    @Transactional
    public boolean deleteCession(UUID id) {
        if (cessionRepository.existsById(id)) {
            cessionRepository.deleteById(id);
            
            // Publish data change event
            eventPublisher.publishEvent(new DataChangeEvent(this, "Cession", "DELETE", id));
            
            return true;
        }
        return false;
    }

    @Transactional
    public Optional<CessionDTO> linkContractDocument(UUID cessionId, UUID documentId) {
        Optional<Cession> cessionOpt = cessionRepository.findById(cessionId);
        Optional<Document> documentOpt = documentRepository.findById(documentId);

        if (cessionOpt.isEmpty() || documentOpt.isEmpty()) {
            return Optional.empty();
        }

        Cession cession = cessionOpt.get();
        Document document = documentOpt.get();

        cession.setContractDocument(document);
        document.setCession(cession);

        Cession savedCession = cessionRepository.save(cession);
        documentRepository.save(document);

        return Optional.of(convertToDTO(savedCession));
    }

    private void updateCessionFromDTO(Cession cession, CessionDTO dto) {
        cession.setTotalLoanAmount(dto.getTotalLoanAmount());
        cession.setMonthlyPayment(dto.getMonthlyPayment());
        cession.setStartDate(dto.getStartDate());
        cession.setEndDate(dto.getEndDate());
        cession.setBankOrAgency(dto.getBankOrAgency());
        cession.setStatus(dto.getStatus());
        cession.setItemDescription(dto.getItemDescription());
        cession.setPersonalAddress(dto.getPersonalAddress());
    }

    private CessionDTO convertToDTO(Cession cession) {
        CessionDTO dto = new CessionDTO();
        dto.setId(cession.getId());
        dto.setClientId(cession.getClient().getId());
        dto.setClientName(cession.getClient().getFullName());
        dto.setClientNumber(cession.getClient().getClientNumber() != null ? cession.getClient().getClientNumber().toString() : null);
        dto.setClientCin(cession.getClient().getCin());
        dto.setClientAddress(cession.getClient().getAddress());
        dto.setClientWorkplace(cession.getClient().getWorkplace() != null ? cession.getClient().getWorkplace().getName() : null);
        dto.setClientJob(cession.getClient().getJob() != null ? cession.getClient().getJob().getName() : null);
        dto.setTotalLoanAmount(cession.getTotalLoanAmount());
        dto.setMonthlyPayment(cession.getMonthlyPayment());
        dto.setStartDate(cession.getStartDate());
        dto.setEndDate(cession.getEndDate());
        dto.setExpectedPayoffDate(cession.getExpectedPayoffDate());
        dto.setRemainingBalance(cession.getRemainingBalance());
        dto.setCurrentProgress(cession.getCurrentProgress());
        dto.setMonthsRemaining(cession.getMonthsRemaining());
        dto.setBankOrAgency(cession.getBankOrAgency());
        dto.setStatus(cession.getStatus());

        // Set contract document info if available
        if (cession.getContractDocument() != null) {
            dto.setContractDocumentId(cession.getContractDocument().getId());
            dto.setContractDocumentName(cession.getContractDocument().getFileName());
        }

        // Set new fields for PDF generation
        dto.setCourtName(cession.getCourtName());
        dto.setBookNumber(cession.getBookNumber());
        dto.setPageNumber(cession.getPageNumber());
        dto.setDate(cession.getDate());
        dto.setSupplierTaxId(cession.getSupplierTaxId());
        dto.setSupplierName(cession.getSupplierName());
        dto.setSupplierAddress(cession.getSupplierAddress());
        dto.setSupplierBankAccount(cession.getSupplierBankAccount());
        dto.setItemDescription(cession.getItemDescription());
        dto.setPersonalAddress(cession.getPersonalAddress());
        dto.setAmountInWords(cession.getAmountInWords());
        dto.setLoanDuration(cession.getLoanDuration());
        dto.setFirstDeductionMonthArabic(cession.getFirstDeductionMonthArabic());

        return dto;
    }
    
    /**
     * Recalculate all fields for a specific cession
     */
    @Transactional
    public Optional<CessionDTO> recalculateCession(UUID id) {
        return calculationService.updateCalculationsById(id)
                .map(this::convertToDTO);
    }
    
    /**
     * Recalculate all fields for all active cessions
     */
    @Transactional
    public void recalculateAllActiveCessions() {
        calculationService.updateCalculationsForAllActiveCessions();
    }
}

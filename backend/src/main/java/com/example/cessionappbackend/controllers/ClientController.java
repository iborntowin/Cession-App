package com.example.cessionappbackend.controllers;

import com.example.cessionappbackend.dto.ClientDTO;
import com.example.cessionappbackend.services.ClientService;
import com.example.cessionappbackend.security.InputSanitizer;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/clients")
@Validated
public class ClientController {

    private static final Logger logger = LoggerFactory.getLogger(ClientController.class);

    @Autowired
    private ClientService clientService;

    @Autowired
    private InputSanitizer inputSanitizer;

    // GET /api/v1/clients - Get all clients
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<ClientDTO>> getAllClients() {
        try {
            logger.debug("Attempting to get all clients. Current authentication: {}", SecurityContextHolder.getContext().getAuthentication());
            List<ClientDTO> clients = clientService.getAllClients();
            return ResponseEntity.ok(clients);
        } catch (Exception e) {
            logger.error("Error retrieving all clients", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to retrieve clients");
        }
    }
    
    // GET /api/v1/clients/search - Search clients by name or job
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<ClientDTO>> searchClients(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String workplaceName,
            @RequestParam(required = false) String jobName,
            @RequestParam(required = false) Integer clientNumber,
            @RequestParam(required = false) @Pattern(regexp = "^\\d{8}$", message = "CIN must be exactly 8 digits") String cin,
            @RequestParam(required = false) @Pattern(regexp = "^[+]?[0-9\\s()-]{8,20}$", message = "Invalid phone number format") String phoneNumber,
            @RequestParam(required = false) String address,
            @RequestParam(required = false) @Pattern(regexp = "^\\d{10}$", message = "Worker number must be exactly 10 digits") String workerNumber) {
        try {
            logger.debug("Attempting to search clients with params: name={}, workplaceName={}, jobName={}", name, workplaceName, jobName);
            
            // If all parameters are null, return all clients
            if (name == null && workplaceName == null && jobName == null && clientNumber == null && cin == null &&
                phoneNumber == null && address == null && workerNumber == null) {
                return ResponseEntity.ok(clientService.getAllClients());
            }
            
            List<ClientDTO> clients = clientService.searchClients(name, workplaceName, jobName, clientNumber, cin, phoneNumber, address, workerNumber);
            return ResponseEntity.ok(clients);
        } catch (Exception e) {
            logger.error("Error searching clients", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to search clients");
        }
    }

    // GET /api/v1/clients/{id} - Get client by ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ClientDTO> getClientById(@PathVariable UUID id) {
        try {
            logger.debug("Attempting to get client by ID: {}", id);
            return clientService.getClientById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("Error retrieving client by ID: {}", id, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to retrieve client");
        }
    }

    // GET /api/v1/clients/cin/{cin} - Get client by CIN
    @GetMapping("/cin/{cin}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ClientDTO> getClientByCin(
            @PathVariable @Pattern(regexp = "^\\d{8}$", message = "CIN must be exactly 8 digits") String cin) {
        try {
            logger.debug("Attempting to get client by CIN: {}", cin);
            return clientService.getClientByCin(cin)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("Error retrieving client by CIN: {}", cin, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to retrieve client");
        }
    }

    // GET /api/v1/clients/check-duplicate - Check if CIN or Worker Number already exists
    @GetMapping("/check-duplicate")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> checkDuplicate(
            @RequestParam(required = false) @Pattern(regexp = "^\\d{8}$", message = "CIN must be exactly 8 digits") String cin,
            @RequestParam(required = false) @Pattern(regexp = "^\\d{10}$", message = "Worker number must be exactly 10 digits") String workerNumber) {
        try {
            logger.debug("Checking for duplicate CIN: {} or Worker Number: {}", cin, workerNumber);
            
            boolean cinExists = false;
            boolean workerNumberExists = false;
            String cinClientId = null;
            String workerNumberClientId = null;
            
            if (cin != null && !cin.trim().isEmpty()) {
                var cinClient = clientService.getClientByCin(cin);
                if (cinClient.isPresent()) {
                    cinExists = true;
                    cinClientId = cinClient.get().getId().toString();
                }
            }
            
            if (workerNumber != null && !workerNumber.trim().isEmpty()) {
                var workerNumberClient = clientService.getClientByWorkerNumber(workerNumber);
                if (workerNumberClient.isPresent()) {
                    workerNumberExists = true;
                    workerNumberClientId = workerNumberClient.get().getId().toString();
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            
            Map<String, Object> data = new HashMap<>();
            data.put("cinExists", cinExists);
            data.put("workerNumberExists", workerNumberExists);
            data.put("cinClientId", cinClientId);
            data.put("workerNumberClientId", workerNumberClientId);
            response.put("data", data);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error checking for duplicates", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to check for duplicates");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // Response class for duplicate check
    public static class DuplicateCheckResponse {
        public final boolean cinExists;
        public final boolean workerNumberExists;
        public final String cinClientId;
        public final String workerNumberClientId;
        
        public DuplicateCheckResponse(boolean cinExists, boolean workerNumberExists, String cinClientId, String workerNumberClientId) {
            this.cinExists = cinExists;
            this.workerNumberExists = workerNumberExists;
            this.cinClientId = cinClientId;
            this.workerNumberClientId = workerNumberClientId;
        }
    }

    // POST /api/v1/clients - Create a new client
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createClient(@Valid @RequestBody ClientDTO clientDto, BindingResult bindingResult) {
        try {
            logger.debug("Attempting to create client: {}", clientDto.getFullName());
            
            // Input validation and sanitization
            try {
                inputSanitizer.validateNameInput(clientDto.getFullName(), "Full Name", true);
                inputSanitizer.validateNumericInput(clientDto.getCin(), "CIN", true);
                inputSanitizer.validateNumericInput(clientDto.getWorkerNumber(), "Worker Number", true);
                inputSanitizer.validateAddressInput(clientDto.getAddress(), "Address", true);
                if (clientDto.getPhoneNumber() != null && !clientDto.getPhoneNumber().trim().isEmpty()) {
                    inputSanitizer.validateNumericInput(clientDto.getPhoneNumber(), "Phone Number", false);
                }
            } catch (IllegalArgumentException e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", e.getMessage());
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Sanitize inputs
            clientDto.setFullName(inputSanitizer.sanitizeForDatabase(clientDto.getFullName()));
            clientDto.setAddress(inputSanitizer.sanitizeForDatabase(clientDto.getAddress()));
            if (clientDto.getPhoneNumber() != null) {
                clientDto.setPhoneNumber(inputSanitizer.sanitizeForDatabase(clientDto.getPhoneNumber()));
            }
            
            // Check for validation errors
            if (bindingResult.hasErrors()) {
                Map<String, String> errors = new HashMap<>();
                bindingResult.getFieldErrors().forEach(error -> 
                    errors.put(error.getField(), error.getDefaultMessage())
                );
                
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Validation failed: " + String.join(", ", errors.values()));
                errorResponse.put("errors", errors);
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            ClientDTO createdClient = clientService.createClient(clientDto);
            logger.info("Successfully created client with ID: {}", createdClient.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", createdClient);
            response.put("message", "Client created successfully");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Client creation failed due to business rule violation: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            logger.error("Unexpected error creating client", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to create client: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // PUT /api/v1/clients/{id} - Update an existing client
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateClient(@PathVariable UUID id, @Valid @RequestBody ClientDTO clientDto, BindingResult bindingResult) {
        try {
            logger.debug("Attempting to update client with ID: {}", id);
            
            // Check for validation errors
            if (bindingResult.hasErrors()) {
                Map<String, String> errors = new HashMap<>();
                bindingResult.getFieldErrors().forEach(error -> 
                    errors.put(error.getField(), error.getDefaultMessage())
                );
                return ResponseEntity.badRequest().body(Map.of("errors", errors, "message", "Validation failed"));
            }
            
            return clientService.updateClient(id, clientDto)
                .map(client -> {
                    logger.info("Successfully updated client with ID: {}", id);
                    return ResponseEntity.ok(client);
                })
                .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            logger.warn("Client update failed due to business rule violation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Unexpected error updating client with ID: {}", id, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update client");
        }
    }

    // DELETE /api/v1/clients/{id} - Delete a client
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteClient(@PathVariable UUID id) {
        try {
            logger.debug("Attempting to delete client with ID: {}", id);
            if (clientService.deleteClient(id)) {
                logger.info("Successfully deleted client with ID: {}", id);
                return ResponseEntity.noContent().build(); // 204 No Content
            } else {
                return ResponseEntity.notFound().build(); // 404 Not Found
            }
        } catch (Exception e) {
            logger.error("Error deleting client with ID: {}", id, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete client");
        }
    }

    // Global exception handler for validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                    error -> error.getField(),
                    error -> error.getDefaultMessage(),
                    (existing, replacement) -> existing
                ));
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", "Validation failed: " + String.join(", ", errors.values()));
        response.put("errors", errors);
        
        logger.warn("Validation failed for client operation: {}", errors);
        return ResponseEntity.badRequest().body(response);
    }
}

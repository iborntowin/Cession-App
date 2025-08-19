package com.example.cessionappbackend.controllers;

import com.example.cessionappbackend.dto.DocumentDTO;
import com.example.cessionappbackend.services.DocumentService;
import com.example.cessionappbackend.repositories.ClientRepository;
import com.example.cessionappbackend.entities.Client;
import com.example.cessionappbackend.dto.SalaryAssignmentDocumentDTO;
import com.example.cessionappbackend.services.SalaryAssignmentPdfGeneratorService;
import com.example.cessionappbackend.security.FileUploadValidator;

import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/v1/documents")
// @CrossOrigin(origins = "${frontend.url}") // Handled globally or via SecurityConfig
public class DocumentController {

    private static final Logger logger = LoggerFactory.getLogger(DocumentController.class);

    @Autowired
    private DocumentService documentService;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private SalaryAssignmentPdfGeneratorService salaryAssignmentPdfGeneratorService;

    @Autowired
    private FileUploadValidator fileUploadValidator;

    // GET /api/v1/documents/client/{clientId} - Get documents by client ID
    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<DocumentDTO>> getDocumentsByClientId(@PathVariable UUID clientId) {
        List<DocumentDTO> documents = documentService.getDocumentsByClientId(clientId);
        return ResponseEntity.ok(documents);
    }

    // GET /api/v1/documents/cession/{cessionId} - Get documents by cession ID
    @GetMapping("/cession/{cessionId}")
    public ResponseEntity<List<DocumentDTO>> getDocumentsByCessionId(@PathVariable UUID cessionId) {
        List<DocumentDTO> documents = documentService.getDocumentsByCessionId(cessionId);
        return ResponseEntity.ok(documents);
    }

    // GET /api/v1/documents/{id} - Get document by ID
    @GetMapping("/{id}")
    public ResponseEntity<DocumentDTO> getDocumentById(@PathVariable UUID id) {
        return documentService.getDocumentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/v1/documents/salary-assignment - Generate Salary Assignment Document (PDF)
    @PostMapping(value = "/salary-assignment", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateSalaryAssignmentPdf(@RequestBody SalaryAssignmentDocumentDTO documentData) {
        try {
            byte[] pdfBytes = salaryAssignmentPdfGeneratorService.generatePdf(documentData);
            if (pdfBytes == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
            }
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"إحالة_على_الأجر_تجارية.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (Exception e) {
            System.err.println("Error generating salary assignment PDF: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // POST /api/v1/documents/clients/{clientId}/documents - Upload client document
    // This endpoint is for general document uploads where clientNumber is not required for naming
    @PostMapping("/clients/{clientId}/documents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadClientDocument(
            @PathVariable UUID clientId,
            @RequestParam("documentType") String documentType,
            @RequestParam("file") @NotNull MultipartFile file) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate file security
            fileUploadValidator.validateFile(file, documentType);
            
            // Get client from repository
            Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
            
            DocumentDTO document = documentService.uploadClientDocument(
                clientId,
                client.getClientNumber(),
                documentType,
                file
            );
            
            response.put("success", true);
            response.put("data", document);
            response.put("message", "Document uploaded successfully");
            
            logger.info("Document uploaded successfully for client {}: {}", clientId, document.getFileName());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("File validation failed for client {}: {}", clientId, e.getMessage());
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("Failed to upload document for client {}: {}", clientId, e.getMessage(), e);
            response.put("success", false);
            response.put("error", "Failed to upload document: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // POST /api/v1/documents/client/{clientId}/specific - Upload specific client documents (ID Card, Job Card)
    // This endpoint accepts clientNumber for naming convention and specific bucket upload
    @PostMapping(value = "/client/{clientId}/specific", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadSpecificClientDocument(
            @PathVariable UUID clientId,
            @RequestParam(value = "clientNumber", required = false) Integer clientNumber, // clientNumber is optional, but preferred for specific docs
            @RequestParam("documentType") @NotNull String documentType,
            @RequestParam("file") @NotNull MultipartFile file) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate file security
            fileUploadValidator.validateFile(file, documentType);
            
            // Use the overloaded service method for specific document types
            DocumentDTO uploadedDocument = documentService.uploadClientDocument(clientId, clientNumber, documentType, file);
            
            response.put("success", true);
            response.put("data", uploadedDocument);
            response.put("message", "Document uploaded successfully");
            
            logger.info("Specific document uploaded successfully for client {}: {}", clientId, uploadedDocument.getFileName());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("File validation failed for client {}: {}", clientId, e.getMessage());
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IOException e) {
            logger.error("IO error uploading document for client {}: {}", clientId, e.getMessage(), e);
            response.put("success", false);
            response.put("error", "Failed to upload document: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            logger.error("Unexpected error uploading document for client {}: {}", clientId, e.getMessage(), e);
            response.put("success", false);
            response.put("error", "Failed to upload document: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // POST /api/v1/documents/cession/{cessionId} - Upload cession contract document
    @PostMapping(value = "/cession/{cessionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadCessionDocument(
            @PathVariable UUID cessionId,
            @RequestParam("file") @NotNull MultipartFile file) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate file security (cession contracts should be PDFs)
            fileUploadValidator.validateFile(file, "CESSION_CONTRACT");
            
            DocumentDTO uploadedDocument = documentService.uploadCessionDocument(cessionId, file);
            
            response.put("success", true);
            response.put("data", uploadedDocument);
            response.put("message", "Cession contract uploaded successfully");
            
            logger.info("Cession contract uploaded successfully for cession {}: {}", cessionId, uploadedDocument.getFileName());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("File validation failed for cession {}: {}", cessionId, e.getMessage());
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IOException e) {
            logger.error("IO error uploading cession contract for cession {}: {}", cessionId, e.getMessage(), e);
            response.put("success", false);
            response.put("error", "Failed to upload document: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            logger.error("Unexpected error uploading cession contract for cession {}: {}", cessionId, e.getMessage(), e);
            response.put("success", false);
            response.put("error", "Failed to upload document: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // DELETE /api/v1/documents/{id} - Delete document
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) {
        if (documentService.deleteDocument(id)) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}

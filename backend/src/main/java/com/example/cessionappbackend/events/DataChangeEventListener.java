package com.example.cessionappbackend.events;

import com.example.cessionappbackend.dto.SupabaseUploadResult;
import com.example.cessionappbackend.services.DataExportService;
import com.example.cessionappbackend.services.SupabaseStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Event listener for data change events that triggers export operations
 * Uses @TransactionalEventListener to ensure events are processed after successful transaction commits
 */
@Component
public class DataChangeEventListener {
    
    private static final Logger logger = LoggerFactory.getLogger(DataChangeEventListener.class);
    
    @Autowired
    private DataExportService dataExportService;
    
    @Autowired
    private SupabaseStorageService supabaseStorageService;
    
    /**
     * Handle data change events asynchronously after transaction commit
     * This ensures export operations only occur after successful database operations
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleDataChangeEvent(DataChangeEvent event) {
        long startTime = System.currentTimeMillis();
        
        try {
            logger.info("Processing data change event: {} operation on {} with ID: {}", 
                       event.getOperation(), event.getEntityType(), event.getEntityId());
            
            // Generate the export after successful database commit
            String jsonExport = dataExportService.generateMinifiedJsonExport();
            
            long exportGenerationTime = System.currentTimeMillis() - startTime;
            logger.info("Successfully generated export after {} operation on {} with ID: {} (took {}ms, size: {} characters)", 
                       event.getOperation(), event.getEntityType(), event.getEntityId(), exportGenerationTime, jsonExport.length());
            
            // Upload to Supabase Storage for mobile client access
            try {
                SupabaseUploadResult uploadResult = supabaseStorageService.uploadJsonFile(jsonExport, "mobile-export.json");
                
                if (uploadResult.isSuccess()) {
                    long totalDuration = System.currentTimeMillis() - startTime;
                    logger.info("Successfully uploaded export to Supabase Storage: {} (total time: {}ms, upload time: {}ms)", 
                               uploadResult.getPublicUrl(), totalDuration, uploadResult.getUploadTimeMs());
                } else {
                    logger.error("Failed to upload export to Supabase Storage: {}", uploadResult.getErrorMessage());
                }
            } catch (Exception uploadException) {
                logger.error("Exception during Supabase upload: {}", uploadException.getMessage(), uploadException);
                // Continue execution - export generation was successful even if upload failed
            }
            
            // Log export statistics for monitoring
            if (logger.isDebugEnabled()) {
                logger.debug("Export triggered by: {} - Export content preview: {}", 
                           event, jsonExport.length() > 100 ? jsonExport.substring(0, 100) + "..." : jsonExport);
            }
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Failed to handle data change event after {}ms: {} - Error: {}", 
                        duration, event, e.getMessage(), e);
            
            // Log additional context for troubleshooting
            logger.error("Export failure context - Entity: {}, Operation: {}, ID: {}", 
                        event.getEntityType(), event.getOperation(), event.getEntityId());
            
            // Don't rethrow - we don't want to affect the main application functionality
            // The export failure should not impact the core business operations
        }
    }
    
    /**
     * Handle rollback events for logging purposes
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void handleDataChangeEventRollback(DataChangeEvent event) {
        logger.warn("Transaction rolled back for data change event: {} operation on {} with ID: {}", 
                   event.getOperation(), event.getEntityType(), event.getEntityId());
        logger.debug("Export operation skipped due to transaction rollback: {}", event);
    }
}
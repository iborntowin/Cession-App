package com.example.cessionappbackend.repositories;

import com.example.cessionappbackend.entities.ExportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExportStatusRepository extends JpaRepository<ExportStatus, UUID> {
    
    /**
     * Find the most recent export status record
     */
    @Query("SELECT e FROM ExportStatus e ORDER BY e.exportTimestamp DESC LIMIT 1")
    Optional<ExportStatus> findLatestExportStatus();
    
    /**
     * Find the most recent successful export
     */
    @Query("SELECT e FROM ExportStatus e WHERE e.status = 'SUCCESS' ORDER BY e.exportTimestamp DESC LIMIT 1")
    Optional<ExportStatus> findLatestSuccessfulExport();
    
    /**
     * Find all export status records ordered by timestamp descending
     */
    @Query("SELECT e FROM ExportStatus e ORDER BY e.exportTimestamp DESC")
    List<ExportStatus> findAllOrderByTimestampDesc();
    
    /**
     * Find export status records by status
     */
    List<ExportStatus> findByStatusOrderByExportTimestampDesc(ExportStatus.ExportStatusEnum status);
    
    /**
     * Count total number of successful exports
     */
    long countByStatus(ExportStatus.ExportStatusEnum status);
}
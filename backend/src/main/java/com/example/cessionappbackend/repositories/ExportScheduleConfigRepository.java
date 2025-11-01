package com.example.cessionappbackend.repositories;

import com.example.cessionappbackend.entities.ExportScheduleConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExportScheduleConfigRepository extends JpaRepository<ExportScheduleConfig, Long> {

    /**
     * Get the active configuration (should only be one)
     */
    @Query("SELECT c FROM ExportScheduleConfig c ORDER BY c.id DESC")
    Optional<ExportScheduleConfig> findActiveConfig();

    /**
     * Count total configurations
     */
    long count();
}

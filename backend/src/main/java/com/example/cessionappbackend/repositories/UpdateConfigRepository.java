package com.example.cessionappbackend.repositories;

import com.example.cessionappbackend.entities.UpdateConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UpdateConfigRepository extends JpaRepository<UpdateConfig, Long> {

    /**
     * Get the active configuration (should only be one)
     */
    @Query("SELECT c FROM UpdateConfig c ORDER BY c.id DESC")
    Optional<UpdateConfig> findActiveConfig();

    /**
     * Count total configurations
     */
    long count();
}
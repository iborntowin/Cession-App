package com.example.cessionappbackend.controllers;

import com.example.cessionappbackend.dto.ComponentStatus;
import com.example.cessionappbackend.dto.LoadingProgressDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/loading-progress")
    public LoadingProgressDTO getLoadingProgress() {
        long startTime = System.currentTimeMillis();

        // Check backend status
        boolean backendHealthy = true; // Backend is running if this endpoint responds
        long backendResponseTime = System.currentTimeMillis() - startTime;

        // Check database status
        boolean databaseHealthy = false;
        long databaseResponseTime = 0;
        String databaseError = null;

        try {
            long dbStartTime = System.currentTimeMillis();
            Integer test = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            databaseResponseTime = System.currentTimeMillis() - dbStartTime;
            databaseHealthy = (test != null && test == 1);
        } catch (Exception e) {
            databaseError = e.getMessage();
            databaseResponseTime = System.currentTimeMillis() - startTime;
        }

        // Calculate overall progress based on component health
        int overallProgress = 0;
        String message = "Initializing system...";

        Map<String, LoadingProgressDTO.ComponentProgress> components = new HashMap<>();

        // Backend component (always 100% if this endpoint responds)
        components.put("backend", new LoadingProgressDTO.ComponentProgress(
            backendHealthy ? 100 : 0,
            backendHealthy ? ComponentStatus.COMPLETED : ComponentStatus.FAILED,
            backendResponseTime
        ));

        // Database component
        components.put("database", new LoadingProgressDTO.ComponentProgress(
            databaseHealthy ? 100 : 0,
            databaseHealthy ? ComponentStatus.COMPLETED : ComponentStatus.FAILED,
            databaseResponseTime
        ));

        // System component (overall system readiness)
        boolean systemReady = backendHealthy && databaseHealthy;
        components.put("system", new LoadingProgressDTO.ComponentProgress(
            systemReady ? 100 : (backendHealthy ? 50 : 0),
            systemReady ? ComponentStatus.COMPLETED : (backendHealthy ? ComponentStatus.INITIALIZING : ComponentStatus.FAILED),
            System.currentTimeMillis() - startTime
        ));

        // Calculate overall progress
        if (systemReady) {
            overallProgress = 100;
            message = "System ready!";
        } else if (backendHealthy && !databaseHealthy) {
            overallProgress = 75;
            message = "Backend ready, connecting to database...";
        } else if (backendHealthy) {
            overallProgress = 50;
            message = "Backend connected, initializing services...";
        } else {
            overallProgress = 25;
            message = "Starting backend services...";
        }

        // Estimate time remaining (rough calculation)
        long estimatedTimeRemaining = 0;
        if (overallProgress < 100) {
            // Assume 30 seconds total for full initialization
            estimatedTimeRemaining = Math.max(0, (100 - overallProgress) * 300); // milliseconds
        }

        return LoadingProgressDTO.builder()
            .overallProgress(overallProgress)
            .components(components)
            .message(message)
            .estimatedTimeRemaining(estimatedTimeRemaining)
            .timestamp(java.time.LocalDateTime.now())
            .build();
    }
}
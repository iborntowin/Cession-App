package com.example.cessionappbackend.dto;

/**
 * Enum representing the status of a component during loading progress.
 */
public enum ComponentStatus {
    /**
     * Component is initializing
     */
    INITIALIZING,

    /**
     * Component is currently loading
     */
    LOADING,

    /**
     * Component has completed successfully
     */
    COMPLETED,

    /**
     * Component has failed to load
     */
    FAILED,

    /**
     * Component is idle or not started
     */
    IDLE
}
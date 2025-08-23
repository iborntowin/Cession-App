package com.example.cessionappbackend.config;

import com.example.cessionappbackend.entities.User;
import com.example.cessionappbackend.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Initializes a default admin user on application startup if it doesn't exist.
 * This ensures there's always an admin account available for login.
 */
@Component
public class DefaultUserInitializer implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DefaultUserInitializer.class);
    
    // SECURITY: Improved default credentials - still for development only
    // TODO: For production, these should be set via environment variables or removed entirely
    private static final String DEFAULT_EMAIL = "admin@cession-app.local";
    private static final String DEFAULT_PASSWORD = "CessionApp2024!"; // Strong password for development
    private static final String DEFAULT_FULL_NAME = "System Administrator";
    private static final String DEFAULT_ROLE = "ADMIN";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        initializeDefaultUser();
    }

    private void initializeDefaultUser() {
        try {
            // Check if the default user already exists
            if (userRepository.existsByEmail(DEFAULT_EMAIL)) {
                logger.info("Default admin user already exists: {}", DEFAULT_EMAIL);
                return;
            }

            // Create the default user
            User defaultUser = new User();
            defaultUser.setEmail(DEFAULT_EMAIL);
            defaultUser.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
            defaultUser.setFullName(DEFAULT_FULL_NAME);
            defaultUser.setRole(DEFAULT_ROLE);
            defaultUser.setActive(true);
            defaultUser.setLastLogin(null); // Will be set on first login

            // Save the user to database
            User savedUser = userRepository.save(defaultUser);
            
            logger.warn("⚠️  SECURITY WARNING: Default admin user created with hardcoded credentials!");
            logger.warn("  Email: {}", savedUser.getEmail());
            logger.warn("  Password: {} (CHANGE THIS IMMEDIATELY IN PRODUCTION!)", DEFAULT_PASSWORD);
            logger.warn("  For production use, set credentials via environment variables or remove default user creation");
            logger.info("  Role: {}", savedUser.getRole());
            logger.info("  Active: {}", savedUser.isActive());
            logger.info("  Created At: {}", savedUser.getCreatedAt());
            
        } catch (Exception e) {
            logger.error("Failed to create default admin user", e);
            // Don't throw exception to prevent application startup failure
        }
    }
}
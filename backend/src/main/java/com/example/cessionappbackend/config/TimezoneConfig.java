package com.example.cessionappbackend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.format.datetime.standard.DateTimeFormatterRegistrar;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import jakarta.annotation.PostConstruct;
import java.time.format.DateTimeFormatter;
import java.util.TimeZone;

/**
 * Configuration to ensure consistent timezone handling between development and production environments.
 * This fixes the issue where danger clients analysis shows different results in dev vs prod builds.
 */
@Configuration
public class TimezoneConfig implements WebMvcConfigurer {

    /**
     * Set the default JVM timezone to UTC to ensure consistent date calculations
     * across different environments and system configurations.
     */
    @PostConstruct
    public void init() {
        // FIXED: Force UTC timezone for consistent date handling between dev/prod
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        System.setProperty("user.timezone", "UTC");
        
        // Log the timezone setting for debugging
        System.out.println("=== TIMEZONE CONFIGURATION ===");
        System.out.println("Default TimeZone: " + TimeZone.getDefault().getID());
        System.out.println("System Property user.timezone: " + System.getProperty("user.timezone"));
        System.out.println("Current time in UTC: " + java.time.LocalDateTime.now(java.time.ZoneOffset.UTC));
        System.out.println("===============================");
    }

    /**
     * Configure date/time formatters to use consistent patterns
     */
    @Override
    public void addFormatters(FormatterRegistry registry) {
        DateTimeFormatterRegistrar registrar = new DateTimeFormatterRegistrar();
        registrar.setDateFormatter(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        registrar.setDateTimeFormatter(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        registrar.registerFormatters(registry);
    }
}
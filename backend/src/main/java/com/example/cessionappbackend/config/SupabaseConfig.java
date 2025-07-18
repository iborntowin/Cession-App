package com.example.cessionappbackend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for Supabase integration
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "supabase")
public class SupabaseConfig {
    
    private String url;
    private String key;
    
    private Storage storage = new Storage();
    private Mobile mobile = new Mobile();
    
    @Data
    public static class Storage {
        private String bucket;
    }
    
    @Data
    public static class Mobile {
        private String bucket = "mobile-exports";
        private Retry retry = new Retry();
        
        @Data
        public static class Retry {
            private int maxAttempts = 3;
            private long delayMs = 1000;
        }
    }
}
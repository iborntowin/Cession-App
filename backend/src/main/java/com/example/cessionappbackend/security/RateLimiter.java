package com.example.cessionappbackend.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class RateLimiter {

    private final ConcurrentHashMap<String, AtomicInteger> requestCounts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong> lastRequestTime = new ConcurrentHashMap<>();
    
    // Rate limiting configuration
    private static final int MAX_REQUESTS_PER_MINUTE = 60;
    private static final int MAX_REQUESTS_PER_HOUR = 1000;
    private static final long MINUTE_IN_MS = 60 * 1000;
    private static final long HOUR_IN_MS = 60 * 60 * 1000;
    
    // Special limits for authentication endpoints
    private static final int MAX_AUTH_REQUESTS_PER_MINUTE = 5;
    private static final int MAX_AUTH_REQUESTS_PER_HOUR = 20;

    public boolean isAllowed(HttpServletRequest request) {
        String clientKey = getClientKey(request);
        String endpoint = request.getRequestURI();
        
        // Apply stricter limits for authentication endpoints
        if (isAuthEndpoint(endpoint)) {
            return checkAuthRateLimit(clientKey);
        }
        
        return checkGeneralRateLimit(clientKey);
    }

    private boolean checkGeneralRateLimit(String clientKey) {
        long currentTime = System.currentTimeMillis();
        
        // Check per minute limit
        String minuteKey = clientKey + ":" + (currentTime / MINUTE_IN_MS);
        AtomicInteger minuteCount = requestCounts.computeIfAbsent(minuteKey, k -> new AtomicInteger(0));
        
        if (minuteCount.incrementAndGet() > MAX_REQUESTS_PER_MINUTE) {
            return false;
        }
        
        // Check per hour limit
        String hourKey = clientKey + ":" + (currentTime / HOUR_IN_MS);
        AtomicInteger hourCount = requestCounts.computeIfAbsent(hourKey, k -> new AtomicInteger(0));
        
        if (hourCount.incrementAndGet() > MAX_REQUESTS_PER_HOUR) {
            return false;
        }
        
        // Clean up old entries
        cleanup(currentTime);
        
        return true;
    }

    private boolean checkAuthRateLimit(String clientKey) {
        long currentTime = System.currentTimeMillis();
        
        // Check per minute limit for auth endpoints
        String minuteKey = "auth:" + clientKey + ":" + (currentTime / MINUTE_IN_MS);
        AtomicInteger minuteCount = requestCounts.computeIfAbsent(minuteKey, k -> new AtomicInteger(0));
        
        if (minuteCount.incrementAndGet() > MAX_AUTH_REQUESTS_PER_MINUTE) {
            return false;
        }
        
        // Check per hour limit for auth endpoints
        String hourKey = "auth:" + clientKey + ":" + (currentTime / HOUR_IN_MS);
        AtomicInteger hourCount = requestCounts.computeIfAbsent(hourKey, k -> new AtomicInteger(0));
        
        if (hourCount.incrementAndGet() > MAX_AUTH_REQUESTS_PER_HOUR) {
            return false;
        }
        
        return true;
    }

    private String getClientKey(HttpServletRequest request) {
        // Try to get user-specific identifier first
        String userKey = request.getRemoteUser();
        if (userKey != null) {
            return "user:" + userKey;
        }
        
        // Fall back to IP address
        String clientIp = getClientIpAddress(request);
        return "ip:" + clientIp;
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }

    private boolean isAuthEndpoint(String endpoint) {
        return endpoint.startsWith("/api/v1/auth/") || 
               endpoint.contains("/login") || 
               endpoint.contains("/register") ||
               endpoint.contains("/reset-password");
    }

    private void cleanup(long currentTime) {
        // Remove entries older than 2 hours
        long cutoffTime = currentTime - (2 * HOUR_IN_MS);
        
        requestCounts.entrySet().removeIf(entry -> {
            String key = entry.getKey();
            try {
                String[] parts = key.split(":");
                long timeSlot = Long.parseLong(parts[parts.length - 1]);
                return timeSlot < (cutoffTime / HOUR_IN_MS);
            } catch (NumberFormatException e) {
                return true; // Remove malformed entries
            }
        });
        
        lastRequestTime.entrySet().removeIf(entry -> 
            entry.getValue().get() < cutoffTime
        );
    }

    public void recordRequest(String clientKey) {
        lastRequestTime.put(clientKey, new AtomicLong(System.currentTimeMillis()));
    }

    public boolean isBlocked(String clientKey) {
        AtomicLong lastTime = lastRequestTime.get(clientKey);
        if (lastTime == null) {
            return false;
        }
        
        long timeSinceLastRequest = System.currentTimeMillis() - lastTime.get();
        
        // If there have been too many recent requests, consider blocking
        String currentMinuteKey = clientKey + ":" + (System.currentTimeMillis() / MINUTE_IN_MS);
        AtomicInteger currentMinuteCount = requestCounts.get(currentMinuteKey);
        
        return currentMinuteCount != null && currentMinuteCount.get() > MAX_REQUESTS_PER_MINUTE;
    }
}

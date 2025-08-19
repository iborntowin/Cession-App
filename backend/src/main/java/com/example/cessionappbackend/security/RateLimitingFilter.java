package com.example.cessionappbackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(1) // Execute before security filters
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingFilter.class);

    @Autowired
    private RateLimiter rateLimiter;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        // Skip rate limiting for static resources
        String requestURI = request.getRequestURI();
        if (isStaticResource(requestURI)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Check rate limit
        if (!rateLimiter.isAllowed(request)) {
            logger.warn("Rate limit exceeded for request: {} from IP: {}", 
                       requestURI, getClientIpAddress(request));
            
            response.setStatus(429); // HTTP 429 Too Many Requests
            response.setContentType("application/json");
            response.setHeader("Retry-After", "60"); // Suggest retry after 60 seconds
            response.getWriter().write(
                "{\"error\":\"Rate limit exceeded\",\"message\":\"Too many requests, please try again later\",\"status\":429}"
            );
            return;
        }

        // Continue with the filter chain
        filterChain.doFilter(request, response);
    }

    private boolean isStaticResource(String requestURI) {
        return requestURI.startsWith("/static/") ||
               requestURI.startsWith("/assets/") ||
               requestURI.startsWith("/css/") ||
               requestURI.startsWith("/js/") ||
               requestURI.startsWith("/images/") ||
               requestURI.startsWith("/fonts/") ||
               requestURI.endsWith(".css") ||
               requestURI.endsWith(".js") ||
               requestURI.endsWith(".png") ||
               requestURI.endsWith(".jpg") ||
               requestURI.endsWith(".jpeg") ||
               requestURI.endsWith(".gif") ||
               requestURI.endsWith(".ico") ||
               requestURI.endsWith(".svg") ||
               requestURI.endsWith(".woff") ||
               requestURI.endsWith(".woff2") ||
               requestURI.endsWith(".ttf") ||
               requestURI.endsWith(".eot");
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
}

package com.example.cessionappbackend.controllers;

import com.example.cessionappbackend.dto.AuthResponse;
import com.example.cessionappbackend.dto.LoginRequest;
import com.example.cessionappbackend.dto.SignupRequest;
import com.example.cessionappbackend.dto.UserDto;
import com.example.cessionappbackend.entities.User;
import com.example.cessionappbackend.repositories.UserRepository;
import com.example.cessionappbackend.services.AuthService;
import com.example.cessionappbackend.services.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*", maxAge = 3600) // Consider removing if handled by SecurityConfig
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        logger.info("Received login request for email: {}", loginRequest.getEmail());
        
        try {
            // Check if user exists
            if (!userRepository.existsByEmail(loginRequest.getEmail())) {
                logger.error("User not found with email: {}", loginRequest.getEmail());
                return ResponseEntity.status(403)
                    .body("Invalid email or password");
            }

            // Attempt authentication
            AuthResponse authResponse = authService.login(loginRequest);
            logger.info("User authenticated successfully: {}", loginRequest.getEmail());

            return ResponseEntity.ok(authResponse);
        } catch (Exception e) {
            logger.error("Authentication failed for user: {} - Error: {}", loginRequest.getEmail(), e.getMessage());
            return ResponseEntity.status(403)
                .body("Authentication failed: " + e.getMessage());
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signupRequest) {
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", "Error: Email is already in use!"));
        }

        // Register user and return AuthResponse for immediate login
        AuthResponse authResponse = authService.signup(signupRequest);
        return ResponseEntity.ok(authResponse);
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<User> users = userService.findAllUsers();
        List<UserDto> userDtos = users.stream()
                .map(user -> new UserDto(user.getEmail(), user.getFullName(), user.getRole()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(userDtos);
    }

    @GetMapping("/user/{email}")
    public ResponseEntity<UserDto> getUserByEmail(@PathVariable String email) {
        User user = userService.findByEmail(email);
        if (user != null) {
            return ResponseEntity.ok(new UserDto(user.getEmail(), user.getFullName(), user.getRole()));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/user/{email}")
    public ResponseEntity<?> deleteUserByEmail(@PathVariable String email) {
        userService.deleteByEmail(email);
        return ResponseEntity.ok("User deleted successfully!");
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        Map<String, Object> database = new HashMap<>();
        
        try {
            // Check database connectivity
            boolean dbConnected = userRepository.count() >= 0; // Simple DB check
            database.put("connected", dbConnected);
            database.put("url", "jdbc:h2:mem:testdb"); // Or get from config
            database.put("error", null);
            
            health.put("status", "UP");
            health.put("database", database);
            health.put("timestamp", java.time.Instant.now().toString());
            health.put("uptime", System.currentTimeMillis()); // Simple uptime
            
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            logger.error("Health check failed", e);
            database.put("connected", false);
            database.put("url", "jdbc:h2:mem:testdb");
            database.put("error", e.getMessage());
            
            health.put("status", "DOWN");
            health.put("database", database);
            health.put("timestamp", java.time.Instant.now().toString());
            health.put("uptime", System.currentTimeMillis());
            
            return ResponseEntity.status(503).body(health);
        }
    }
}

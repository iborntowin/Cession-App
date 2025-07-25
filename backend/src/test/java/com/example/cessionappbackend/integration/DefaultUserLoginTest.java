package com.example.cessionappbackend.integration;

import com.example.cessionappbackend.dto.AuthResponse;
import com.example.cessionappbackend.dto.LoginRequest;
import com.example.cessionappbackend.services.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DefaultUserLoginTest {

    @Autowired
    private AuthService authService;

    @Test
    public void testDefaultUserCanLogin() {
        // Create login request for default user
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("Mousser@gmail.com");
        loginRequest.setPassword("123456");

        // Attempt login
        AuthResponse authResponse = authService.login(loginRequest);

        // Verify login response
        assertNotNull(authResponse, "Auth response should not be null");
        assertNotNull(authResponse.getToken(), "JWT token should be generated");
        assertEquals("Mousser@gmail.com", authResponse.getEmail());
        assertEquals("Default Admin", authResponse.getFullName());
        assertEquals("ADMIN", authResponse.getRole());
        assertNotNull(authResponse.getId(), "User ID should be present");
        
        // Verify token is not empty
        assertFalse(authResponse.getToken().isEmpty(), "JWT token should not be empty");
        assertTrue(authResponse.getToken().startsWith("eyJ"), "JWT token should start with 'eyJ'");
    }

    @Test
    public void testDefaultUserCannotLoginWithWrongPassword() {
        // Create login request with wrong password
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("Mousser@gmail.com");
        loginRequest.setPassword("wrongpassword");

        // Attempt login should throw exception
        assertThrows(RuntimeException.class, () -> {
            authService.login(loginRequest);
        }, "Login should fail with wrong password");
    }
}
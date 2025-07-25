package com.example.cessionappbackend.services;

import com.example.cessionappbackend.dto.AuthResponse;
import com.example.cessionappbackend.dto.SignupRequest;
import com.example.cessionappbackend.entities.User;
import com.example.cessionappbackend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class AuthServiceRoleTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    public void setUp() {
        // Clean up any existing users
        userRepository.deleteAll();
    }

    @Test
    public void testFirstUserGetsAdminRole() {
        // Create first user signup request
        SignupRequest firstUserRequest = new SignupRequest();
        firstUserRequest.setEmail("first@example.com");
        firstUserRequest.setPassword("password123");
        firstUserRequest.setFirstName("First");
        firstUserRequest.setLastName("User");

        // Sign up first user
        AuthResponse firstUserResponse = authService.signup(firstUserRequest);

        // Verify first user gets ADMIN role
        assertEquals("ADMIN", firstUserResponse.getRole());
        assertEquals("first@example.com", firstUserResponse.getEmail());
        assertEquals("First User", firstUserResponse.getFullName());

        // Verify in database
        User firstUser = userRepository.findByEmail("first@example.com").orElse(null);
        assertNotNull(firstUser);
        assertEquals("ADMIN", firstUser.getRole());
    }

    @Test
    public void testSubsequentUsersGetUserRole() {
        // Create and save first user (admin)
        SignupRequest firstUserRequest = new SignupRequest();
        firstUserRequest.setEmail("admin@example.com");
        firstUserRequest.setPassword("password123");
        firstUserRequest.setFirstName("Admin");
        firstUserRequest.setLastName("User");
        authService.signup(firstUserRequest);

        // Create second user signup request
        SignupRequest secondUserRequest = new SignupRequest();
        secondUserRequest.setEmail("user@example.com");
        secondUserRequest.setPassword("password123");
        secondUserRequest.setFirstName("Regular");
        secondUserRequest.setLastName("User");

        // Sign up second user
        AuthResponse secondUserResponse = authService.signup(secondUserRequest);

        // Verify second user gets USER role
        assertEquals("USER", secondUserResponse.getRole());
        assertEquals("user@example.com", secondUserResponse.getEmail());
        assertEquals("Regular User", secondUserResponse.getFullName());

        // Verify in database
        User secondUser = userRepository.findByEmail("user@example.com").orElse(null);
        assertNotNull(secondUser);
        assertEquals("USER", secondUser.getRole());
    }

    @Test
    public void testMultipleUsersGetUserRole() {
        // Create first user (admin)
        SignupRequest adminRequest = new SignupRequest();
        adminRequest.setEmail("admin@example.com");
        adminRequest.setPassword("password123");
        adminRequest.setFirstName("Admin");
        adminRequest.setLastName("User");
        authService.signup(adminRequest);

        // Create multiple regular users
        for (int i = 1; i <= 3; i++) {
            SignupRequest userRequest = new SignupRequest();
            userRequest.setEmail("user" + i + "@example.com");
            userRequest.setPassword("password123");
            userRequest.setFirstName("User");
            userRequest.setLastName(String.valueOf(i));

            AuthResponse userResponse = authService.signup(userRequest);

            // Each subsequent user should get USER role
            assertEquals("USER", userResponse.getRole());
            assertEquals("user" + i + "@example.com", userResponse.getEmail());
        }

        // Verify total user count and roles
        assertEquals(4, userRepository.count()); // 1 admin + 3 users

        // Count users by role
        long adminCount = userRepository.findAll().stream()
                .filter(user -> "ADMIN".equals(user.getRole()))
                .count();
        long userCount = userRepository.findAll().stream()
                .filter(user -> "USER".equals(user.getRole()))
                .count();

        assertEquals(1, adminCount);
        assertEquals(3, userCount);
    }

    @Test
    public void testDefaultUserDoesNotAffectRoleAssignment() {
        // Note: This test assumes the DefaultUserInitializer has already created the default user
        // If default user exists, the next signup should still get USER role (not ADMIN)
        
        // Check if default user exists
        boolean defaultUserExists = userRepository.existsByEmail("Mousser@gmail.com");
        
        if (defaultUserExists) {
            // Create a new user signup request
            SignupRequest userRequest = new SignupRequest();
            userRequest.setEmail("newuser@example.com");
            userRequest.setPassword("password123");
            userRequest.setFirstName("New");
            userRequest.setLastName("User");

            // Sign up new user
            AuthResponse userResponse = authService.signup(userRequest);

            // Should get USER role even though default admin exists
            assertEquals("USER", userResponse.getRole());
        }
    }
}
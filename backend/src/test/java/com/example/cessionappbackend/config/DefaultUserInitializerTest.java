package com.example.cessionappbackend.config;

import com.example.cessionappbackend.entities.User;
import com.example.cessionappbackend.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DefaultUserInitializerTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    public void testDefaultUserCreation() {
        // Check if default user exists
        Optional<User> defaultUser = userRepository.findByEmail("Mousser@gmail.com");
        
        assertTrue(defaultUser.isPresent(), "Default user should be created on startup");
        
        User user = defaultUser.get();
        assertEquals("Mousser@gmail.com", user.getEmail());
        assertEquals("Default Admin", user.getFullName());
        assertEquals("ADMIN", user.getRole());
        assertTrue(user.isActive());
        
        // Verify password is properly encoded
        assertTrue(passwordEncoder.matches("123456", user.getPassword()), 
                   "Password should be properly encoded and match original");
    }
}
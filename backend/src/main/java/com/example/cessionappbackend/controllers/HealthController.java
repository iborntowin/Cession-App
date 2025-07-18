package com.example.cessionappbackend.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/db")
    public Map<String, Object> checkDb() {
        Map<String, Object> result = new HashMap<>();
        try {
            Integer test = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            result.put("status", "UP");
            result.put("result", test);
        } catch (Exception e) {
            result.put("status", "DOWN");
            result.put("error", e.getMessage());
        }
        return result;
    }
} 
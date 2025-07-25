package com.example.cessionappbackend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // For production Tauri app, we need to allow all origins temporarily
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        // Alternative: specific origins for better security
        // configuration.setAllowedOrigins(Arrays.asList(
        //     "http://localhost:5173",
        //     "http://127.0.0.1:5173",
        //     "tauri://localhost",
        //     "https://tauri.localhost",
        //     "http://tauri.localhost"
        // ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "X-Requested-With"
        ));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, ex) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("Unauthorized");
                }))
            .authorizeHttpRequests(auth -> auth
                // Allow unauthenticated access to static resources and index.html
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/favicon.ico",
                    "/_app/**",
                    "/fonts/**",
                    "/assets/**",
                    "/static/**"
                ).permitAll()
                // Allow unauthenticated access to auth endpoints and health
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/health/db").permitAll()
                
                // Admin-only endpoints
                .requestMatchers("/api/v1/auth/users").hasRole("ADMIN")
                .requestMatchers("/api/v1/auth/user/**").hasRole("ADMIN")
                
                // Core business endpoints - accessible by both USER and ADMIN
                .requestMatchers("/api/v1/clients/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/cessions/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/payments/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/products/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/expenses/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/income/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/jobs/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/workplaces/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/documents/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/financial-summary/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/v1/export/**").hasAnyRole("USER", "ADMIN")
                
                // Any other authenticated request
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
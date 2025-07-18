package com.example.cessionappbackend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/");
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Forward all routes except those containing a dot (.) to index.html
        registry.addViewController("/{spring:[^\\.]+}")
            .setViewName("forward:/index.html");
        registry.addViewController("/**/{spring:[^\\.]+}")
            .setViewName("forward:/index.html");
    }
}
package com.example.cessionappbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class CessionAppBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(CessionAppBackendApplication.class, args);
	}

}


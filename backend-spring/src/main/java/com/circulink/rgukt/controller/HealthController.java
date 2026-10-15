package com.circulink.rgukt.controller;

import com.circulink.rgukt.repository.CommonRepositories.OnlineUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class HealthController {

    private final OnlineUserRepository onlineUserRepository;

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "🚀 RGUKT CircuLink Platform API (Spring Boot 3 + MySQL 8) is running",
                "timestamp", Instant.now(),
                "dbStatus", "connected",
                "onlineUsers", onlineUserRepository.count(),
                "version", "2.0.0-SPRING"
        ));
    }
}

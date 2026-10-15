package com.circulink.rgukt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CircuLinkApplication {

    public static void main(String[] args) {
        SpringApplication.run(CircuLinkApplication.class, args);
        System.out.println("====================================================");
        System.out.println("🎓 CircuLink RGUKT Official Campus Platform (Spring Boot)");
        System.out.println("🚀 Backend Server running at: http://localhost:5000");
        System.out.println("🏥 Health check endpoint:    http://localhost:5000/api/health");
        System.out.println("🔌 Real-time WebSocket:      ws://localhost:5000/ws-circulink");
        System.out.println("====================================================");
    }
}

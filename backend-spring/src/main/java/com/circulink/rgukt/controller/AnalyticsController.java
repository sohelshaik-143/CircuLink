package com.circulink.rgukt.controller;

import com.circulink.rgukt.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview(
            @RequestParam(required = false) String campus,
            @RequestParam(required = false) String branch) {
        return ResponseEntity.ok(analyticsService.getOverview(campus, branch));
    }

    @GetMapping("/branch-activity")
    public ResponseEntity<Map<String, Object>> getBranchActivity() {
        return ResponseEntity.ok(analyticsService.getBranchActivity());
    }

    @GetMapping("/topic-trends")
    public ResponseEntity<Map<String, Object>> getTopicTrends() {
        return ResponseEntity.ok(analyticsService.getTopicTrends());
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('DEAN', 'DIRECTOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String action) {
        return ResponseEntity.ok(analyticsService.getAuditLogs(page, limit, action));
    }
}

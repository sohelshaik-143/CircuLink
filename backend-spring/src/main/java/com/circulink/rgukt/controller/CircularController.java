package com.circulink.rgukt.controller;

import com.circulink.rgukt.dto.CircularDtos.*;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.service.CircularWorkflowService;
import com.circulink.rgukt.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/circulars")
@RequiredArgsConstructor
public class CircularController {

    private final CircularWorkflowService workflowService;
    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<CircularFeedResponse> getCirculars(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String campus,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {

        CircularFeedResponse res = workflowService.getCirculars(
                currentUser, branch, campus, category, priority, status, search, page, limit);
        return ResponseEntity.ok(res);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN')")
    public ResponseEntity<SingleCircularResponse> createCircular(
            @AuthenticationPrincipal User author,
            @RequestBody CircularCreateRequest req) {

        SingleCircularResponse res = workflowService.createCircular(req, author);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN')")
    public ResponseEntity<SingleCircularResponse> approveCircular(
            @PathVariable Long id,
            @AuthenticationPrincipal User approver,
            @RequestBody(required = false) ApproveRequest req) {

        String comment = req != null ? req.getComment() : "";
        SingleCircularResponse res = workflowService.approveCircular(id, approver, comment);
        return ResponseEntity.ok(res);
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN')")
    public ResponseEntity<SingleCircularResponse> rejectCircular(
            @PathVariable Long id,
            @AuthenticationPrincipal User approver,
            @RequestBody RejectRequest req) {

        SingleCircularResponse res = workflowService.rejectCircular(id, approver, req.getReason());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        workflowService.markAsRead(id, user);
        return ResponseEntity.ok(Map.of("success", true, "message", "Marked as read."));
    }

    @PostMapping("/emergency")
    @PreAuthorize("hasAnyRole('SECURITY', 'DEAN', 'DIRECTOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> broadcastEmergency(
            @AuthenticationPrincipal User sender,
            @RequestBody Map<String, String> body) {

        String title = body.get("title");
        String content = body.get("content");
        notificationService.broadcastEmergency(sender, title, content, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Emergency broadcast sent to all users."
        ));
    }
}

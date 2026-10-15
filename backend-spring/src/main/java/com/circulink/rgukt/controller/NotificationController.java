package com.circulink.rgukt.controller;

import com.circulink.rgukt.entity.Notification;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.repository.CommonRepositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {

        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit);
        Page<Notification> notifPage = unreadOnly
                ? notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(user.getId(), pageable)
                : notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId(), pageable);

        long unreadCount = notificationRepository.countByRecipientIdAndIsReadFalse(user.getId());

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("notifications", notifPage.getContent());
        res.put("unreadCount", unreadCount);
        return ResponseEntity.ok(res);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getRecipient().getId().equals(user.getId())) {
                n.setIsRead(true);
                n.setReadAt(Instant.now());
                notificationRepository.save(n);
            }
        });
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<Map<String, Object>> markAllRead(@AuthenticationPrincipal User user) {
        Page<Notification> unread = notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(
                user.getId(), PageRequest.of(0, 1000));
        unread.forEach(n -> {
            n.setIsRead(true);
            n.setReadAt(Instant.now());
        });
        notificationRepository.saveAll(unread);

        return ResponseEntity.ok(Map.of("success", true, "message", "All notifications marked as read."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getRecipient().getId().equals(user.getId())) {
                notificationRepository.delete(n);
            }
        });
        return ResponseEntity.ok(Map.of("success", true));
    }
}

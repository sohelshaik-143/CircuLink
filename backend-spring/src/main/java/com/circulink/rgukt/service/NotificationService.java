package com.circulink.rgukt.service;

import com.circulink.rgukt.entity.Notification;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.repository.CommonRepositories.NotificationRepository;
import com.circulink.rgukt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Notification sendToUser(User recipient, User sender, String type, String title, String message, String link) {
        Notification notif = Notification.builder()
                .recipient(recipient)
                .sender(sender)
                .type(type)
                .title(title)
                .message(message)
                .link(link)
                .priority(Notification.Priority.MEDIUM)
                .build();

        notif = notificationRepository.save(notif);

        // Push real-time over STOMP WebSocket
        messagingTemplate.convertAndSendToUser(
                recipient.getId().toString(),
                "/queue/notifications",
                Map.of(
                        "_id", notif.getId(),
                        "title", notif.getTitle(),
                        "message", notif.getMessage(),
                        "type", notif.getType(),
                        "createdAt", notif.getCreatedAt()
                )
        );

        return notif;
    }

    @Transactional
    public void sendToMany(List<User> recipients, User sender, String type, String title, String message) {
        if (recipients == null || recipients.isEmpty()) return;

        List<Notification> list = new ArrayList<>();
        for (User r : recipients) {
            list.add(Notification.builder()
                    .recipient(r)
                    .sender(sender)
                    .type(type)
                    .title(title)
                    .message(message)
                    .priority(Notification.Priority.HIGH)
                    .build());
        }
        notificationRepository.saveAll(list);

        for (User r : recipients) {
            messagingTemplate.convertAndSendToUser(
                    r.getId().toString(),
                    "/queue/notifications",
                    Map.of("title", title, "message", message, "type", type)
            );
        }
    }

    @Transactional
    public void broadcastEmergency(User sender, String title, String content, Long circularId) {
        List<User> allUsers = userRepository.findAll();
        List<Notification> alerts = new ArrayList<>();
        for (User u : allUsers) {
            alerts.add(Notification.builder()
                    .recipient(u)
                    .sender(sender)
                    .type("EMERGENCY")
                    .title("🚨 EMERGENCY: " + title)
                    .message(content)
                    .priority(Notification.Priority.URGENT)
                    .isEmergency(true)
                    .build());
        }
        notificationRepository.saveAll(alerts);

        // Broadcast to global topic
        messagingTemplate.convertAndSend("/topic/emergency", Map.of(
                "title", title,
                "content", content,
                "broadcastBy", sender.getName(),
                "broadcastAt", new Date()
        ));
    }
}

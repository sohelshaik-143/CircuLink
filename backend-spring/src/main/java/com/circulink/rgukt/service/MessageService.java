package com.circulink.rgukt.service;

import com.circulink.rgukt.dto.MessageDtos.MessageDto;
import com.circulink.rgukt.dto.MessageDtos.UnreadCountDto;
import com.circulink.rgukt.entity.Message;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.repository.CommonRepositories.MessageRepository;
import com.circulink.rgukt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public List<MessageDto> getConversation(Long currentUserId, Long otherUserId) {
        List<Message> messages = messageRepository.findConversation(currentUserId, otherUserId);

        // Mark incoming messages as read
        for (Message m : messages) {
            if (m.getReceiver().getId().equals(currentUserId) && Boolean.FALSE.equals(m.getIsRead())) {
                m.setIsRead(true);
                m.setReadAt(Instant.now());
                messageRepository.save(m);
            }
        }

        return messages.stream().map(this::toDto).toList();
    }

    @Transactional
    public MessageDto sendMessage(User sender, Long receiverId, String content, String fileUrl, String fileType, String fileName) {
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new NoSuchElementException("Receiver not found."));

        if (!Boolean.TRUE.equals(sender.getJoinedCommunity()) || !Boolean.TRUE.equals(receiver.getJoinedCommunity())) {
            throw new IllegalStateException("Both users must be community members to message.");
        }

        Message msg = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .fileUrl(fileUrl)
                .fileType(fileType != null ? Message.FileType.valueOf(fileType.toLowerCase()) : null)
                .fileName(fileName)
                .isRead(false)
                .build();

        msg = messageRepository.save(msg);
        MessageDto dto = toDto(msg);

        // STOMP real-time push to recipient
        messagingTemplate.convertAndSendToUser(
                receiver.getId().toString(),
                "/queue/messages",
                dto
        );

        return dto;
    }

    @Transactional(readOnly = true)
    public List<UnreadCountDto> getUnreadCounts(Long userId) {
        List<Object[]> raw = messageRepository.getUnreadCountsBySender(userId);
        List<UnreadCountDto> list = new ArrayList<>();
        for (Object[] r : raw) {
            Long senderId = (Long) r[0];
            long count = ((Number) r[1]).longValue();
            list.add(new UnreadCountDto(senderId, count));
        }
        return list;
    }

    @Transactional
    public void joinCommunity(Long userId) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setJoinedCommunity(true);
            u.setCommunityJoinedAt(Instant.now());
            userRepository.save(u);
        });
    }

    @Transactional
    public void leaveCommunity(Long userId) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setJoinedCommunity(false);
            userRepository.save(u);
        });
    }

    private MessageDto toDto(Message m) {
        return MessageDto.builder()
                .id(m.getId())
                .sender(m.getSender().getId())
                .receiver(m.getReceiver().getId())
                .senderName(m.getSender().getName())
                .content(m.getContent())
                .fileUrl(m.getFileUrl())
                .fileType(m.getFileType() != null ? m.getFileType().name() : null)
                .fileName(m.getFileName())
                .isRead(m.getIsRead())
                .readAt(m.getReadAt())
                .createdAt(m.getCreatedAt())
                .build();
    }
}

package com.circulink.rgukt.controller;

import com.circulink.rgukt.dto.MessageDtos.MessageDto;
import com.circulink.rgukt.dto.MessageDtos.UnreadCountDto;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/messages/{userId}")
    public ResponseEntity<Map<String, Object>> getConversation(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {

        List<MessageDto> messages = messageService.getConversation(currentUser.getId(), userId);
        return ResponseEntity.ok(Map.of("success", true, "messages", messages));
    }

    @PostMapping("/messages/{userId}")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long userId,
            @AuthenticationPrincipal User sender,
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {

        String content = body != null ? body.get("content") : null;
        String fileUrl = null;
        String fileType = null;
        String fileName = null;

        if (file != null && !file.isEmpty()) {
            File dir = new File("uploads/messages");
            if (!dir.exists()) dir.mkdirs();
            fileName = file.getOriginalFilename();
            String ext = fileName != null && fileName.contains(".") ? fileName.substring(fileName.lastIndexOf(".")) : "";
            String savedName = UUID.randomUUID() + ext;
            file.transferTo(new File(dir, savedName));
            fileUrl = "/uploads/messages/" + savedName;
            fileType = (ext.equalsIgnoreCase(".jpg") || ext.equalsIgnoreCase(".png") || ext.equalsIgnoreCase(".jpeg")) ? "image" : "file";
        }

        MessageDto dto = messageService.sendMessage(sender, userId, content, fileUrl, fileType, fileName);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "message", dto));
    }

    @GetMapping("/messages/unread")
    public ResponseEntity<Map<String, Object>> getUnreadCounts(@AuthenticationPrincipal User user) {
        List<UnreadCountDto> counts = messageService.getUnreadCounts(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "counts", counts));
    }

    @PostMapping("/users/community/join")
    public ResponseEntity<Map<String, Object>> joinCommunity(@AuthenticationPrincipal User user) {
        messageService.joinCommunity(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "message", "You have joined the community!"));
    }

    @PostMapping("/users/community/leave")
    public ResponseEntity<Map<String, Object>> leaveCommunity(@AuthenticationPrincipal User user) {
        messageService.leaveCommunity(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "message", "You have left the community."));
    }
}

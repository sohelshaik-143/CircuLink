package com.circulink.rgukt.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;

public class MessageDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessageDto {
        @JsonProperty("_id")
        private Long id;
        private Long sender;
        private Long receiver;
        private String senderName;
        private String content;
        private String fileUrl;
        private String fileType;
        private String fileName;
        private Boolean isRead;
        private Instant readAt;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UnreadCountDto {
        @JsonProperty("_id")
        private Long id;
        private long count;
    }
}

package com.circulink.rgukt.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;
import java.util.List;

public class CircularDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CircularCreateRequest {
        private String title;
        private String content;
        private String category;
        private String priority;
        private List<String> targetBranches;
        private List<String> targetCampuses;
        private List<String> targetYears;
        private Instant expiryDate;
        private Boolean requiresAcknowledgment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApproveRequest {
        private String comment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectRequest {
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ApprovalStepDto {
        private String role;
        private String status;
        private PostDtos.AuthorDto approvedBy;
        private String comment;
        private Instant actionAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CircularDto {
        @JsonProperty("_id")
        private Long id;
        private String circularNumber;
        private String title;
        private String content;
        private String category;
        private String priority;
        private String status;
        private PostDtos.AuthorDto author;
        private String authorRole;
        private List<String> targetBranches;
        private List<String> targetCampuses;
        private List<String> targetYears;
        private Boolean requiresAcknowledgment;
        private Boolean isRead;
        private Boolean isAcknowledged;
        private List<ApprovalStepDto> approvalChain;
        private Instant publishDate;
        private Instant expiryDate;
        private Boolean isActive;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CircularFeedResponse {
        private boolean success;
        private int count;
        private long total;
        private int pages;
        private int unreadCount;
        private List<CircularDto> circulars;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SingleCircularResponse {
        private boolean success;
        private String message;
        private CircularDto circular;
    }
}

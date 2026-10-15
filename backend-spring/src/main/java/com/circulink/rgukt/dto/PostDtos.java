package com.circulink.rgukt.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;
import java.util.List;

public class PostDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PostCreateRequest {
        private String title;
        private String content;
        private String type;
        private List<String> topics;
        private List<String> tags;
        private String branch;
        private String campus;
        private String visibility;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentRequest {
        private String content;
        private Long parentComment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EndorseRequest {
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuthorDto {
        @JsonProperty("_id")
        private Long id;
        private String name;
        private String collegeId;
        private String role;
        private String branch;
        private String campus;
        private String profilePicture;
        private String level;
        private List<String> badges;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EndorsementDto {
        private AuthorDto user;
        private String message;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CommentDto {
        @JsonProperty("_id")
        private Long id;
        private String content;
        private AuthorDto author;
        private Instant createdAt;
        private Boolean isEdited;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PostDto {
        @JsonProperty("_id")
        private Long id;
        private String title;
        private String content;
        private String type;
        private List<String> topics;
        private List<String> tags;
        private String branch;
        private String campus;
        private String visibility;
        private String thumbnailUrl;
        private AuthorDto author;
        private Integer likesCount;
        private Integer endorsementsCount;
        private Integer shares;
        private Integer views;
        private String status;
        private Boolean isFeatured;
        private Boolean isPinned;
        private Boolean isLiked;
        private List<CommentDto> comments;
        private List<EndorsementDto> endorsements;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PostFeedResponse {
        private boolean success;
        private int count;
        private long total;
        private int pages;
        private int currentPage;
        private List<PostDto> posts;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SinglePostResponse {
        private boolean success;
        private PostDto post;
    }
}

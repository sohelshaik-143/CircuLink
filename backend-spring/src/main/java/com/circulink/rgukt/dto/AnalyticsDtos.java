package com.circulink.rgukt.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;
import java.util.List;

public class AnalyticsDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CampusStatDto {
        @JsonProperty("_id")
        private String id;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopPostDto {
        @JsonProperty("_id")
        private Long id;
        private String title;
        private Integer likesCount;
        private String branch;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OverviewStatsDto {
        private long totalUsers;
        private long totalStudents;
        private long totalPosts;
        private long totalCirculars;
        private long pendingCirculars;
        private long onlineUsers;
        private long communityMembers;
        private List<CampusStatDto> campusBreakdown;
        private String activeCampus;
        private List<TopPostDto> topPosts;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BranchActivityDto {
        private String branch;
        private long posts;
        private long students;
        private long faculty;
        private long endorsements;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopicTrendDto {
        @JsonProperty("_id")
        private String id;
        private long count;
        private long likes;
    }
}

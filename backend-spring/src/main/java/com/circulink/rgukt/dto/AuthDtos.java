package com.circulink.rgukt.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

public class AuthDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        private String collegeId;
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
        @NotBlank
        private String name;
        @NotBlank
        private String role;
        private String branch;
        @NotBlank
        private String campus;
        private String year;
        private String section;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String loginId;
        private String collegeId;
        private String email;
        @NotBlank
        private String password;
        private String mfaToken;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoogleLoginRequest {
        @NotBlank
        private String tokenId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RefreshTokenRequest {
        @NotBlank
        private String refreshToken;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForgotPasswordRequest {
        @NotBlank @Email
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        @NotBlank
        private String token;
        @NotBlank
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyMfaRequest {
        @NotBlank
        private String token;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserDto {
        @JsonProperty("_id")
        private Long id;
        private String collegeId;
        private String name;
        private String email;
        private String role;
        private String branch;
        private String campus;
        private String year;
        private String section;
        private Integer points;
        private Integer streakDays;
        private String level;
        private List<String> badges;
        private String profilePicture;
        private String bio;
        private String phone;
        private Boolean mfaEnabled;
        private Boolean joinedCommunity;
        private String theme;
        private String language;
        private Boolean isActive;
        private Boolean isOnline;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuthResponse {
        private boolean success;
        private String message;
        private String token;
        private String refreshToken;
        private Boolean requiresMFA;
        private UserDto user;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenRefreshResponse {
        private boolean success;
        private String token;
        private String refreshToken;
    }
}

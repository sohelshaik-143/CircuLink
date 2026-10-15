package com.circulink.rgukt.service;

import com.circulink.rgukt.config.JwtTokenProvider;
import com.circulink.rgukt.dto.AuthDtos.*;
import com.circulink.rgukt.entity.AuditLog;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.entity.UserBadge;
import com.circulink.rgukt.repository.AuditLogRepository;
import com.circulink.rgukt.repository.UserBadgeRepository;
import com.circulink.rgukt.repository.UserRepository;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    private static final Set<String> STUDENT_ALLOWED_DOMAINS = Set.of(
            "rguktrkv.ac.in", "rguktong.ac.in", "rguktskl.ac.in", "rguktnuz.ac.in", "rguktbasar.ac.in", "rgukt.ac.in"
    );

    @Transactional
    public AuthResponse register(RegisterRequest req, String ipAddress) {
        String email = req.getEmail().toLowerCase().trim();
        String collegeId = req.getCollegeId() != null ? req.getCollegeId().trim().toUpperCase() : null;
        User.Role role = User.Role.valueOf(req.getRole().toUpperCase());

        if (role == User.Role.STUDENT) {
            if (collegeId == null || collegeId.isEmpty()) {
                throw new IllegalArgumentException("Student ID (College ID) is required for student registration.");
            }
            String domain = email.contains("@") ? email.split("@")[1] : "";
            if (!STUDENT_ALLOWED_DOMAINS.contains(domain)) {
                throw new IllegalArgumentException("Students must register with their college email (e.g. r220379@rguktrkv.ac.in).");
            }
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("User with this email already exists.");
        }
        if (collegeId != null && userRepository.existsByCollegeIdIgnoreCase(collegeId)) {
            throw new IllegalArgumentException("User with this Student ID already exists.");
        }

        User user = User.builder()
                .collegeId(collegeId)
                .email(email)
                .password(passwordEncoder.encode(req.getPassword()))
                .name(req.getName().trim())
                .role(role)
                .branch(req.getBranch() != null ? User.Branch.valueOf(req.getBranch().toUpperCase()) : User.Branch.GENERAL)
                .campus(User.Campus.fromString(req.getCampus()))
                .year(req.getYear() != null && !req.getYear().isEmpty() ? User.Year.valueOf(req.getYear().replace("-", "_")) : null)
                .section(req.getSection())
                .points(10)
                .level(User.Level.Beginner)
                .build();

        user = userRepository.save(user);

        // Record Audit Log
        auditLogRepository.save(AuditLog.builder()
                .user(user)
                .action("REGISTER")
                .resourceType("User")
                .resourceId(user.getId())
                .ipAddress(ipAddress)
                .campus(user.getCampus().name())
                .branch(user.getBranch() != null ? user.getBranch().name() : null)
                .build());

        String token = tokenProvider.generateToken(user);
        String rawRefreshToken = tokenProvider.generateRefreshToken(user);
        user.setRefreshTokenHash(JwtTokenProvider.hashToken(rawRefreshToken));
        userRepository.save(user);

        return AuthResponse.builder()
                .success(true)
                .message("Registration successful.")
                .token(token)
                .refreshToken(rawRefreshToken)
                .user(toUserDto(user))
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest req, String ipAddress, String userAgent) {
        String identifier = req.getLoginId();
        if (identifier == null || identifier.isBlank()) identifier = req.getEmail();
        if (identifier == null || identifier.isBlank()) identifier = req.getCollegeId();

        if (identifier == null || req.getPassword() == null) {
            throw new IllegalArgumentException("Please provide College ID or email and password.");
        }
        identifier = identifier.trim();

        User user = identifier.contains("@")
                ? userRepository.findByEmailIgnoreCase(identifier).orElse(null)
                : userRepository.findByCollegeIdIgnoreCase(identifier).orElse(null);

        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials.");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadCredentialsException("Your account has been deactivated.");
        }

        // MFA check for privileged administrative roles
        Set<User.Role> mfaRequiredRoles = Set.of(User.Role.HOD, User.Role.DSW, User.Role.DEAN, User.Role.DIRECTOR, User.Role.ADMIN);
        if (mfaRequiredRoles.contains(user.getRole()) && Boolean.TRUE.equals(user.getMfaEnabled())) {
            if (req.getMfaToken() == null || req.getMfaToken().isBlank()) {
                return AuthResponse.builder()
                        .success(true)
                        .requiresMFA(true)
                        .message("MFA token required.")
                        .build();
            }

            TimeProvider timeProvider = new SystemTimeProvider();
            CodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(HashingAlgorithm.SHA1), timeProvider);
            if (!verifier.isValidCode(user.getMfaSecret(), req.getMfaToken().trim())) {
                throw new BadCredentialsException("Invalid MFA token.");
            }
        }

        user.setLastLogin(Instant.now());
        String token = tokenProvider.generateToken(user);
        String rawRefreshToken = tokenProvider.generateRefreshToken(user);
        user.setRefreshTokenHash(JwtTokenProvider.hashToken(rawRefreshToken));
        userRepository.save(user);

        auditLogRepository.save(AuditLog.builder()
                .user(user)
                .action("LOGIN")
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .campus(user.getCampus().name())
                .branch(user.getBranch() != null ? user.getBranch().name() : null)
                .build());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .refreshToken(rawRefreshToken)
                .user(toUserDto(user))
                .build();
    }

    @Transactional
    public AuthResponse googleLogin(String tokenId, String ipAddress) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                    .header("Authorization", "Bearer " + tokenId)
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new BadCredentialsException("Invalid Google token");
            }

            String body = response.body();
            // Simple robust JSON extract without heavy dependencies
            String email = extractJsonField(body, "email");
            String name = extractJsonField(body, "name");
            String googleId = extractJsonField(body, "sub");
            String picture = extractJsonField(body, "picture");

            String domain = email != null && email.contains("@") ? email.split("@")[1].toLowerCase().trim() : "";
            if (!STUDENT_ALLOWED_DOMAINS.contains(domain)) {
                throw new IllegalArgumentException("Only college email accounts are allowed (@rguktrkv.ac.in, @rguktong.ac.in, etc.).");
            }

            // Campus detection
            User.Campus campus = User.Campus.RK_Valley;
            if (domain.contains("ong")) campus = User.Campus.Ongole;
            else if (domain.contains("skl")) campus = User.Campus.Srikakulam;
            else if (domain.contains("nuz")) campus = User.Campus.Nuzvid;
            else if (domain.contains("basar")) campus = User.Campus.Basar;

            User user = userRepository.findByGoogleId(googleId)
                    .or(() -> userRepository.findByEmailIgnoreCase(email))
                    .orElse(null);

            if (user == null) {
                String collegeId = email.split("@")[0].toUpperCase();
                user = User.builder()
                        .collegeId(collegeId)
                        .email(email)
                        .name(name != null ? name : collegeId)
                        .googleId(googleId)
                        .isGoogleUser(true)
                        .role(User.Role.STUDENT)
                        .campus(campus)
                        .branch(User.Branch.CSE)
                        .year(User.Year.E1)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .profilePicture(picture != null ? picture : "")
                        .points(10)
                        .level(User.Level.Beginner)
                        .build();
            } else {
                user.setGoogleId(googleId);
                user.setIsGoogleUser(true);
                if (picture != null) user.setProfilePicture(picture);
            }

            user = userRepository.save(user);

            String token = tokenProvider.generateToken(user);
            String rawRefreshToken = tokenProvider.generateRefreshToken(user);
            user.setRefreshTokenHash(JwtTokenProvider.hashToken(rawRefreshToken));
            userRepository.save(user);

            return AuthResponse.builder()
                    .success(true)
                    .token(token)
                    .refreshToken(rawRefreshToken)
                    .user(toUserDto(user))
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Google authentication failed: " + e.getMessage(), e);
        }
    }

    @Transactional
    public TokenRefreshResponse refreshToken(String rawRefreshToken) {
        if (!tokenProvider.validateToken(rawRefreshToken)) {
            throw new BadCredentialsException("Refresh token expired or invalid.");
        }

        String hash = JwtTokenProvider.hashToken(rawRefreshToken);
        User user = userRepository.findByRefreshTokenHash(hash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token."));

        String newToken = tokenProvider.generateToken(user);
        String newRefreshToken = tokenProvider.generateRefreshToken(user);
        user.setRefreshTokenHash(JwtTokenProvider.hashToken(newRefreshToken));
        userRepository.save(user);

        return new TokenRefreshResponse(true, newToken, newRefreshToken);
    }

    @Transactional
    public void logout(Long userId) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setRefreshTokenHash(null);
            userRepository.save(u);
        });
    }

    @Transactional
    public Map<String, Object> forgotPassword(String email) {
        User user = userRepository.findByEmailIgnoreCase(email.toLowerCase().trim()).orElse(null);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);

        if (user != null) {
            String token = UUID.randomUUID().toString().replace("-", "");
            user.setPasswordResetToken(token);
            user.setPasswordResetExpires(Instant.now().plus(1, ChronoUnit.HOURS));
            userRepository.save(user);

            res.put("message", "Password reset token generated.");
            res.put("resetToken", token);
            res.put("note", "Use this token to reset your password within 1 hour");
        } else {
            res.put("message", "If that email exists, a reset link has been sent.");
        }
        return res;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token."));

        if (user.getPasswordResetExpires() == null || user.getPasswordResetExpires().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Reset token has expired.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpires(null);
        userRepository.save(user);
    }

    @Transactional
    public Map<String, Object> setupMfa(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        String secret = new DefaultSecretGenerator().generate();
        user.setMfaSecret(secret);
        userRepository.save(user);

        QrData data = new QrData.Builder()
                .label(user.getEmail())
                .secret(secret)
                .issuer("RGUKT CircuLink")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("secret", secret);
        res.put("otpauth_url", data.getUri());
        return res;
    }

    @Transactional
    public void verifyMfa(Long userId, String token) {
        User user = userRepository.findById(userId).orElseThrow();
        TimeProvider timeProvider = new SystemTimeProvider();
        CodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(HashingAlgorithm.SHA1), timeProvider);

        if (!verifier.isValidCode(user.getMfaSecret(), token.trim())) {
            throw new IllegalArgumentException("Invalid MFA token.");
        }

        user.setMfaEnabled(true);
        userRepository.save(user);
    }

    public UserDto toUserDto(User user) {
        List<String> badges = userBadgeRepository.findByUserId(user.getId())
                .stream().map(UserBadge::getBadgeName).toList();

        return UserDto.builder()
                .id(user.getId())
                .collegeId(user.getCollegeId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .branch(user.getBranch() != null ? user.getBranch().name() : null)
                .campus(user.getCampus().getDisplayName())
                .year(user.getYear() != null ? user.getYear().getLabel() : null)
                .section(user.getSection())
                .points(user.getPoints())
                .streakDays(user.getStreakDays())
                .level(user.getLevel().name())
                .badges(badges)
                .profilePicture(user.getProfilePicture())
                .bio(user.getBio())
                .phone(user.getPhone())
                .mfaEnabled(user.getMfaEnabled())
                .joinedCommunity(user.getJoinedCommunity())
                .theme(user.getTheme().name())
                .language(user.getLanguage().name())
                .isActive(user.getIsActive())
                .build();
    }

    private String extractJsonField(String json, String field) {
        String key = "\"" + field + "\":\"";
        int start = json.indexOf(key);
        if (start == -1) return null;
        start += key.length();
        int end = json.indexOf("\"", start);
        return end != -1 ? json.substring(start, end) : null;
    }
}

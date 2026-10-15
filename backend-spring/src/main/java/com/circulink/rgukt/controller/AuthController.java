package com.circulink.rgukt.controller;

import com.circulink.rgukt.dto.AuthDtos.*;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request) {
        AuthResponse res = authService.register(req, request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest request) {
        AuthResponse res = authService.login(req, request.getRemoteAddr(), request.getHeader("User-Agent"));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest req, HttpServletRequest request) {
        AuthResponse res = authService.googleLogin(req.getTokenId(), request.getRemoteAddr());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<TokenRefreshResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest req) {
        TokenRefreshResponse res = authService.refreshToken(req.getRefreshToken());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@AuthenticationPrincipal User user) {
        if (user != null) {
            authService.logout(user.getId());
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out successfully."));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of("success", true, "user", authService.toUserDto(user)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        return ResponseEntity.ok(authService.forgotPassword(req.getEmail()));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req.getToken(), req.getPassword());
        return ResponseEntity.ok(Map.of("success", true, "message", "Password reset successfully. You can now log in."));
    }

    @PostMapping("/setup-mfa")
    public ResponseEntity<Map<String, Object>> setupMfa(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.setupMfa(user.getId()));
    }

    @PostMapping("/verify-mfa")
    public ResponseEntity<Map<String, Object>> verifyMfa(@AuthenticationPrincipal User user,
                                                         @Valid @RequestBody VerifyMfaRequest req) {
        authService.verifyMfa(user.getId(), req.getToken());
        return ResponseEntity.ok(Map.of("success", true, "message", "MFA enabled successfully."));
    }
}

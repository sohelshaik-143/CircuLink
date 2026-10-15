package com.circulink.rgukt.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_campus_role", columnList = "campus, role"),
    @Index(name = "idx_users_email", columnList = "email"),
    @Index(name = "idx_users_college_id", columnList = "college_id"),
    @Index(name = "idx_users_points", columnList = "points")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "college_id", length = 50, unique = true)
    private String collegeId;

    @Column(nullable = false, unique = true, length = 191)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Branch branch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Campus campus;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Year year;

    @Column(length = 20)
    private String section;

    @Column(name = "profile_picture", length = 500)
    @Builder.Default
    private String profilePicture = "";

    @Column(length = 300)
    @Builder.Default
    private String bio = "";

    @Column(length = 20)
    @Builder.Default
    private String phone = "";

    @Column(nullable = false)
    @Builder.Default
    private Integer points = 0;

    @Column(name = "streak_days", nullable = false)
    @Builder.Default
    private Integer streakDays = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Level level = Level.Beginner;

    @Column(name = "mfa_enabled", nullable = false)
    @Builder.Default
    private Boolean mfaEnabled = false;

    @Column(name = "mfa_secret")
    private String mfaSecret;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "last_login")
    private Instant lastLogin;

    @Column(name = "last_active_date")
    private LocalDate lastActiveDate;

    @Column(name = "refresh_token_hash", length = 64)
    private String refreshTokenHash;

    @Column(name = "password_reset_token", length = 128)
    private String passwordResetToken;

    @Column(name = "password_reset_expires")
    private Instant passwordResetExpires;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @Builder.Default
    private Theme theme = Theme.light;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @Builder.Default
    private Language language = Language.en;

    @Column(name = "google_id", length = 100, unique = true)
    private String googleId;

    @Column(name = "is_google_user", nullable = false)
    @Builder.Default
    private Boolean isGoogleUser = false;

    @Column(name = "joined_community", nullable = false)
    @Builder.Default
    private Boolean joinedCommunity = false;

    @Column(name = "community_joined_at")
    private Instant communityJoinedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserBadge> badges = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Role {
        STUDENT, FACULTY, HOD, DSW, DEAN, DIRECTOR, SECURITY, ADMIN
    }

    public enum Branch {
        CSE, ECE, EEE, MECH, CIVIL, CHEM, MMT, MME, GENERAL, PUC, ALL
    }

    public enum Campus {
        RK_Valley("RK Valley"),
        Nuzvid("Nuzvid"),
        Basar("Basar"),
        Srikakulam("Srikakulam"),
        Ongole("Ongole"),
        ALL("ALL");

        private final String displayName;

        Campus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }

        public static Campus fromString(String val) {
            if (val == null) return RK_Valley;
            for (Campus c : Campus.values()) {
                if (c.name().equalsIgnoreCase(val) || c.displayName.equalsIgnoreCase(val)) {
                    return c;
                }
            }
            return RK_Valley;
        }
    }

    public enum Year {
        PUC_1("PUC-1"), PUC_2("PUC-2"), E1("E1"), E2("E2"), E3("E3"), E4("E4"), ALL("ALL");

        private final String label;
        Year(String label) { this.label = label; }
        public String getLabel() { return label; }
    }

    public enum Level {
        Beginner, Intermediate, Advanced, Expert
    }

    public enum Theme {
        light, dark
    }

    public enum Language {
        en, te
    }
}

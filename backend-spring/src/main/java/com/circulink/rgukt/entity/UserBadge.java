package com.circulink.rgukt.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "user_badges", uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_badge", columnNames = {"user_id", "badge_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "badge_name", nullable = false, length = 100)
    private String badgeName;

    @CreationTimestamp
    @Column(name = "awarded_at", nullable = false, updatable = false)
    private Instant awardedAt;
}

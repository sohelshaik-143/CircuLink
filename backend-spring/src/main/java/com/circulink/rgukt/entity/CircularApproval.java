package com.circulink.rgukt.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "circular_approvals", uniqueConstraints = {
    @UniqueConstraint(name = "uk_circular_step", columnNames = {"circular_id", "step_order"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircularApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circular_id", nullable = false)
    private Circular circular;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    private User approvedBy;

    @Column(length = 500)
    @Builder.Default
    private String comment = "";

    @Column(name = "action_at")
    private Instant actionAt;

    public enum Role {
        HOD, DSW, DEAN, DIRECTOR
    }

    public enum Status {
        PENDING, APPROVED, REJECTED
    }
}

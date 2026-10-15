package com.circulink.rgukt.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "circulars", indexes = {
    @Index(name = "idx_circulars_status_created", columnList = "status, created_at"),
    @Index(name = "idx_circulars_priority", columnList = "priority")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Circular {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "circular_number", nullable = false, unique = true, length = 100)
    private String circularNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "author_role", nullable = false, length = 50)
    private String authorRole;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "requires_acknowledgment", nullable = false)
    @Builder.Default
    private Boolean requiresAcknowledgment = false;

    @Column(name = "publish_date")
    private Instant publishDate;

    @Column(name = "expiry_date")
    private Instant expiryDate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rejected_by_id")
    private User rejectedBy;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;

    @OneToMany(mappedBy = "circular", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CircularTarget> targets = new ArrayList<>();

    @OneToMany(mappedBy = "circular", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepOrder ASC")
    @Builder.Default
    private List<CircularApproval> approvalChain = new ArrayList<>();

    @OneToMany(mappedBy = "circular", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CircularReadReceipt> readReceipts = new ArrayList<>();

    @OneToMany(mappedBy = "circular", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CircularAcknowledgment> acknowledgments = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Category {
        ACADEMIC, ADMINISTRATIVE, EXAM, EVENT, HOLIDAY, EMERGENCY, PLACEMENT, SPORTS, CULTURAL, OTHER
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, URGENT
    }

    public enum Status {
        DRAFT, PENDING_HOD, PENDING_DEAN, PENDING_DIRECTOR, APPROVED, REJECTED, PUBLISHED
    }
}

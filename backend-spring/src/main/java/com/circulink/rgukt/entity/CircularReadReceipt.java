package com.circulink.rgukt.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "circular_read_receipts")
@IdClass(CircularReadReceipt.ReceiptId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircularReadReceipt {

    @Id
    @Column(name = "circular_id")
    private Long circularId;

    @Id
    @Column(name = "user_id")
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circular_id", insertable = false, updatable = false)
    private Circular circular;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "read_at", nullable = false, updatable = false)
    private Instant readAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReceiptId implements Serializable {
        private Long circularId;
        private Long userId;
    }
}

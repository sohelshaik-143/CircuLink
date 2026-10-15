package com.circulink.rgukt.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "circular_targets", indexes = {
    @Index(name = "idx_circular_target", columnList = "target_type, target_value")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircularTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circular_id", nullable = false)
    private Circular circular;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private TargetType targetType;

    @Column(name = "target_value", nullable = false, length = 50)
    private String targetValue;

    public enum TargetType {
        BRANCH, CAMPUS, YEAR
    }
}

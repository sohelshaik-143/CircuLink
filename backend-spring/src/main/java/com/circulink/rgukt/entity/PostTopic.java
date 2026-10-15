package com.circulink.rgukt.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "post_topics")
@IdClass(PostTopic.TopicId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostTopic {

    @Id
    @Column(name = "post_id")
    private Long postId;

    @Id
    @Column(length = 50)
    private String topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", insertable = false, updatable = false)
    private Post post;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicId implements Serializable {
        private Long postId;
        private String topic;
    }
}

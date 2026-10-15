package com.circulink.rgukt.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "post_tags")
@IdClass(PostTag.TagId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostTag {

    @Id
    @Column(name = "post_id")
    private Long postId;

    @Id
    @Column(length = 50)
    private String tag;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", insertable = false, updatable = false)
    private Post post;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TagId implements Serializable {
        private Long postId;
        private String tag;
    }
}

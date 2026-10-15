package com.circulink.rgukt.repository;

import com.circulink.rgukt.entity.Post;
import com.circulink.rgukt.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {

    long countByStatus(Post.Status status);

    long countByBranchAndStatus(User.Branch branch, Post.Status status);

    long countByCampusAndStatus(User.Campus campus, Post.Status status);

    long countByAuthorIdAndStatus(Long authorId, Post.Status status);

    long countByAuthorIdAndTypeAndStatus(Long authorId, Post.Type type, Post.Status status);

    @Query("SELECT p FROM Post p WHERE p.status = 'PUBLISHED' " +
           "AND (LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.content) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Post> searchPosts(@Param("q") String q, Pageable pageable);

    @Query("SELECT t.topic, COUNT(p) FROM PostTopic t JOIN t.post p WHERE p.status = 'PUBLISHED' GROUP BY t.topic ORDER BY COUNT(p) DESC")
    List<Object[]> getTopTopics(Pageable pageable);
}

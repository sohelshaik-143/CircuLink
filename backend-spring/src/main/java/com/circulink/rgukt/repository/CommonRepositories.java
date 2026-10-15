package com.circulink.rgukt.repository;

import com.circulink.rgukt.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

public interface CommonRepositories {

    @Repository
    interface CommentRepository extends JpaRepository<Comment, Long> {
        List<Comment> findByPostIdOrderByCreatedAtAsc(Long postId);
    }

    @Repository
    interface MessageRepository extends JpaRepository<Message, Long> {
        @Query("SELECT m FROM Message m WHERE (m.sender.id = :u1 AND m.receiver.id = :u2) " +
               "OR (m.sender.id = :u2 AND m.receiver.id = :u1) ORDER BY m.createdAt ASC")
        List<Message> findConversation(@Param("u1") Long u1, @Param("u2") Long u2);

        @Query("SELECT m.sender.id, COUNT(m) FROM Message m WHERE m.receiver.id = :receiverId AND m.isRead = FALSE GROUP BY m.sender.id")
        List<Object[]> getUnreadCountsBySender(@Param("receiverId") Long receiverId);
    }

    @Repository
    interface NotificationRepository extends JpaRepository<Notification, Long> {
        Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);
        Page<Notification> findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(Long recipientId, Pageable pageable);
        long countByRecipientIdAndIsReadFalse(Long recipientId);
    }

    @Repository
    interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
        Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
        Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
        Page<AuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
    }

    @Repository
    interface OnlineUserRepository extends JpaRepository<OnlineUser, Long> {
        Optional<OnlineUser> findBySessionId(String sessionId);
        long count();
    }

    @Repository
    interface PostLikeRepository extends JpaRepository<PostLike, PostLike.LikeId> {
        boolean existsByPostIdAndUserId(Long postId, Long userId);
        void deleteByPostIdAndUserId(Long postId, Long userId);
    }

    @Repository
    interface PostEndorsementRepository extends JpaRepository<PostEndorsement, Long> {
        boolean existsByPostIdAndFacultyId(Long postId, Long facultyId);
        List<PostEndorsement> findByPostId(Long postId);
        long countByPostAuthorId(Long authorId);
    }

    @Repository
    interface CircularApprovalRepository extends JpaRepository<CircularApproval, Long> {
        Optional<CircularApproval> findByCircularIdAndStepOrder(Long circularId, Integer stepOrder);
    }

    @Repository
    interface CircularReadReceiptRepository extends JpaRepository<CircularReadReceipt, CircularReadReceipt.ReceiptId> {
        boolean existsByCircularIdAndUserId(Long circularId, Long userId);
    }

    @Repository
    interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
        List<UserBadge> findByUserId(Long userId);
        boolean existsByUserIdAndBadgeName(Long userId, String badgeName);
    }

    @Repository
    interface UserFollowerRepository extends JpaRepository<UserFollower, UserFollower.FollowerId> {
        boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);
        void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);
        List<UserFollower> findByFollowerId(Long followerId);
        List<UserFollower> findByFollowingId(Long followingId);
    }
}

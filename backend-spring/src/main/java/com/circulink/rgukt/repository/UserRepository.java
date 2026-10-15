package com.circulink.rgukt.repository;

import com.circulink.rgukt.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByCollegeIdIgnoreCase(String collegeId);

    Optional<User> findByGoogleId(String googleId);

    Optional<User> findByRefreshTokenHash(String refreshTokenHash);

    Optional<User> findByPasswordResetToken(String token);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByCollegeIdIgnoreCase(String collegeId);

    List<User> findByRoleAndIsActiveTrue(User.Role role);

    List<User> findByRoleAndCampusAndIsActiveTrue(User.Role role, User.Campus campus);

    long countByIsActiveTrue();

    long countByRoleAndIsActiveTrue(User.Role role);

    long countByJoinedCommunityTrueAndIsActiveTrue();

    @Query("SELECT u FROM User u WHERE u.isActive = TRUE AND u.role = 'STUDENT' " +
           "AND (:campus IS NULL OR u.campus = :campus) " +
           "AND (:branch IS NULL OR u.branch = :branch) " +
           "ORDER BY u.points DESC")
    Page<User> findLeaderboard(@Param("campus") User.Campus campus, 
                               @Param("branch") User.Branch branch, 
                               Pageable pageable);

    @Query("SELECT u.campus, COUNT(u) FROM User u WHERE u.isActive = TRUE AND u.role = 'STUDENT' GROUP BY u.campus ORDER BY COUNT(u) DESC")
    List<Object[]> getCampusStudentCounts();
}

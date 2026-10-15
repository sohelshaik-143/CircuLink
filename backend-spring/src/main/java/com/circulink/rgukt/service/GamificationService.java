package com.circulink.rgukt.service;

import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.entity.UserBadge;
import com.circulink.rgukt.repository.CommonRepositories.PostEndorsementRepository;
import com.circulink.rgukt.repository.CommonRepositories.UserBadgeRepository;
import com.circulink.rgukt.repository.CommonRepositories.UserFollowerRepository;
import com.circulink.rgukt.repository.PostRepository;
import com.circulink.rgukt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GamificationService {

    private final UserRepository userRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final PostRepository postRepository;
    private final PostEndorsementRepository endorsementRepository;
    private final UserFollowerRepository followerRepository;
    private final NotificationService notificationService;

    public static final Map<String, Integer> POINT_ACTIONS = Map.of(
            "CREATE_POST", 10,
            "CREATE_RESEARCH", 20,
            "COMMENT", 5,
            "LIKE_RECEIVED", 2,
            "ENDORSE_RECEIVED", 50,
            "CIRCULAR_APPROVED", 15,
            "DAILY_LOGIN", 3,
            "STREAK_BONUS", 25
    );

    @Transactional
    public void awardPoints(Long userId, String action) {
        int pts = POINT_ACTIONS.getOrDefault(action, 0);
        if (pts <= 0) return;

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        user.setPoints(user.getPoints() + pts);
        user.setLevel(calculateLevel(user.getPoints()));

        if (user.getPoints() >= 500 && !userBadgeRepository.existsByUserIdAndBadgeName(userId, "Top Contributor")) {
            awardBadge(user, "Top Contributor");
        }

        userRepository.save(user);
    }

    @Transactional
    public void checkAndAwardBadges(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        long postCount = postRepository.countByAuthorIdAndStatus(userId, com.circulink.rgukt.entity.Post.Status.PUBLISHED);
        long socialCount = postRepository.countByAuthorIdAndTypeAndStatus(userId, com.circulink.rgukt.entity.Post.Type.SOCIAL_SERVICE, com.circulink.rgukt.entity.Post.Status.PUBLISHED);
        long endorsementCount = endorsementRepository.countByPostAuthorId(userId);
        long followerCount = followerRepository.findByFollowingId(userId).size();

        if (postCount >= 1 && !userBadgeRepository.existsByUserIdAndBadgeName(userId, "First Post")) {
            awardBadge(user, "First Post");
        }
        if (postCount >= 5 && !userBadgeRepository.existsByUserIdAndBadgeName(userId, "Innovator")) {
            awardBadge(user, "Innovator");
        }
        if (socialCount >= 1 && !userBadgeRepository.existsByUserIdAndBadgeName(userId, "Social Hero")) {
            awardBadge(user, "Social Hero");
        }
        if (endorsementCount >= 1 && !userBadgeRepository.existsByUserIdAndBadgeName(userId, "Faculty Approved")) {
            awardBadge(user, "Faculty Approved");
        }
        if (followerCount >= 10 && !userBadgeRepository.existsByUserIdAndBadgeName(userId, "Community Builder")) {
            awardBadge(user, "Community Builder");
        }
    }

    @Transactional
    public void recordDailyLogin(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        LocalDate today = LocalDate.now();
        LocalDate lastActive = user.getLastActiveDate();

        if (!today.equals(lastActive)) {
            int newStreak = user.getStreakDays() != null ? user.getStreakDays() : 0;
            if (lastActive != null && lastActive.plusDays(1).equals(today)) {
                newStreak += 1;
            } else {
                newStreak = 1;
            }

            user.setStreakDays(newStreak);
            user.setLastActiveDate(today);
            user.setPoints(user.getPoints() + POINT_ACTIONS.get("DAILY_LOGIN"));

            if (newStreak % 7 == 0) {
                user.setPoints(user.getPoints() + POINT_ACTIONS.get("STREAK_BONUS"));
                awardBadge(user, "7-Day Streak");
            }

            user.setLevel(calculateLevel(user.getPoints()));
            userRepository.save(user);
        }
    }

    private void awardBadge(User user, String badgeName) {
        if (!userBadgeRepository.existsByUserIdAndBadgeName(user.getId(), badgeName)) {
            userBadgeRepository.save(UserBadge.builder().user(user).badgeName(badgeName).build());
            notificationService.sendToUser(user, null, "BADGE_EARNED",
                    "🏅 New Badge: " + badgeName + "!",
                    "Congratulations! You earned the \"" + badgeName + "\" badge.",
                    "/profile");
        }
    }

    public static User.Level calculateLevel(int points) {
        if (points >= 1000) return User.Level.Expert;
        if (points >= 500) return User.Level.Advanced;
        if (points >= 200) return User.Level.Intermediate;
        return User.Level.Beginner;
    }
}

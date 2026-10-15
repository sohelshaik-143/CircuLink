package com.circulink.rgukt.config;

import com.circulink.rgukt.entity.*;
import com.circulink.rgukt.repository.CircularRepository;
import com.circulink.rgukt.repository.CommonRepositories.CircularApprovalRepository;
import com.circulink.rgukt.repository.CommonRepositories.UserBadgeRepository;
import com.circulink.rgukt.repository.PostRepository;
import com.circulink.rgukt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataMigrationSeedRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CircularRepository circularRepository;
    private final CircularApprovalRepository approvalRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        System.out.println("🌱 Initializing CircuLink MySQL 8 seed data...");
        String encodedPassword = passwordEncoder.encode("Password@123");

        User director = userRepository.save(User.builder()
                .collegeId("DIRECTOR01")
                .email("director@rguktrkv.ac.in")
                .password(encodedPassword)
                .name("Prof. K. Venkata Ramana")
                .role(User.Role.DIRECTOR)
                .branch(User.Branch.GENERAL)
                .campus(User.Campus.RK_Valley)
                .points(500)
                .level(User.Level.Advanced)
                .joinedCommunity(true)
                .build());

        User admin = userRepository.save(User.builder()
                .collegeId("ADMIN01")
                .email("admin@rguktrkv.ac.in")
                .password(encodedPassword)
                .name("RGUKT System Administrator")
                .role(User.Role.ADMIN)
                .branch(User.Branch.GENERAL)
                .campus(User.Campus.RK_Valley)
                .points(1000)
                .level(User.Level.Expert)
                .joinedCommunity(true)
                .build());

        User dean = userRepository.save(User.builder()
                .collegeId("DEAN01")
                .email("dean.academics@rguktrkv.ac.in")
                .password(encodedPassword)
                .name("Dr. S. Chandra Sekhar")
                .role(User.Role.DEAN)
                .branch(User.Branch.CSE)
                .campus(User.Campus.RK_Valley)
                .points(600)
                .level(User.Level.Advanced)
                .joinedCommunity(true)
                .build());

        User dsw = userRepository.save(User.builder()
                .collegeId("DSW01")
                .email("dsw@rguktrkv.ac.in")
                .password(encodedPassword)
                .name("Dr. M. Anjaneyulu")
                .role(User.Role.DSW)
                .branch(User.Branch.ECE)
                .campus(User.Campus.RK_Valley)
                .points(400)
                .level(User.Level.Intermediate)
                .joinedCommunity(true)
                .build());

        User hod = userRepository.save(User.builder()
                .collegeId("HODCSE01")
                .email("hod.cse@rguktrkv.ac.in")
                .password(encodedPassword)
                .name("Dr. P. Sreenivasulu")
                .role(User.Role.HOD)
                .branch(User.Branch.CSE)
                .campus(User.Campus.RK_Valley)
                .points(450)
                .level(User.Level.Intermediate)
                .joinedCommunity(true)
                .build());

        User faculty = userRepository.save(User.builder()
                .collegeId("FAC01")
                .email("faculty.cse@rguktrkv.ac.in")
                .password(encodedPassword)
                .name("Mr. Ramesh Babu")
                .role(User.Role.FACULTY)
                .branch(User.Branch.CSE)
                .campus(User.Campus.RK_Valley)
                .points(250)
                .level(User.Level.Intermediate)
                .joinedCommunity(true)
                .build());

        User security = userRepository.save(User.builder()
                .collegeId("SEC01")
                .email("security@rguktrkv.ac.in")
                .password(encodedPassword)
                .name("Chief Security Officer")
                .role(User.Role.SECURITY)
                .branch(User.Branch.GENERAL)
                .campus(User.Campus.RK_Valley)
                .points(100)
                .level(User.Level.Beginner)
                .joinedCommunity(true)
                .build());

        User student1 = userRepository.save(User.builder()
                .collegeId("R220379")
                .email("r220379@rguktrkv.ac.in")
                .password(encodedPassword)
                .name("Sohel Shaik")
                .role(User.Role.STUDENT)
                .branch(User.Branch.CSE)
                .campus(User.Campus.RK_Valley)
                .year(User.Year.E3)
                .section("CSE-02")
                .points(850)
                .level(User.Level.Advanced)
                .joinedCommunity(true)
                .build());

        User student2 = userRepository.save(User.builder()
                .collegeId("N210100")
                .email("n210100@rguktnuz.ac.in")
                .password(encodedPassword)
                .name("Priya Sharma")
                .role(User.Role.STUDENT)
                .branch(User.Branch.ECE)
                .campus(User.Campus.Nuzvid)
                .year(User.Year.E4)
                .section("ECE-01")
                .points(520)
                .level(User.Level.Advanced)
                .joinedCommunity(true)
                .build());

        userBadgeRepository.saveAll(List.of(
                UserBadge.builder().user(student1).badgeName("First Post").build(),
                UserBadge.builder().user(student1).badgeName("Innovator").build(),
                UserBadge.builder().user(student1).badgeName("Faculty Approved").build(),
                UserBadge.builder().user(student1).badgeName("Top Contributor").build(),
                UserBadge.builder().user(student2).badgeName("First Post").build()
        ));

        // Circulars
        Circular c1 = circularRepository.save(Circular.builder()
                .circularNumber("RGUKT/2026/0001")
                .author(director)
                .authorRole("DIRECTOR")
                .title("Commencement of Academic Year 2026-27 & Registration Guidelines")
                .content("All students and faculty across RK Valley, Nuzvid, Srikakulam, and Ongole campuses are hereby informed that the academic year 2026-27 will commence on July 1st, 2026. Online registration portals are open.")
                .category(Circular.Category.ACADEMIC)
                .priority(Circular.Priority.HIGH)
                .status(Circular.Status.PUBLISHED)
                .publishDate(Instant.now())
                .isActive(true)
                .build());

        approvalRepository.saveAll(List.of(
                CircularApproval.builder().circular(c1).stepOrder(0).role(CircularApproval.Role.HOD).status(CircularApproval.Status.APPROVED).approvedBy(director).actionAt(Instant.now()).build(),
                CircularApproval.builder().circular(c1).stepOrder(1).role(CircularApproval.Role.DEAN).status(CircularApproval.Status.APPROVED).approvedBy(director).actionAt(Instant.now()).build(),
                CircularApproval.builder().circular(c1).stepOrder(2).role(CircularApproval.Role.DIRECTOR).status(CircularApproval.Status.APPROVED).approvedBy(director).actionAt(Instant.now()).build()
        ));

        // Post
        postRepository.save(Post.builder()
                .author(student1)
                .title("Autonomous Campus Navigation Rover using ROS2 and LiDAR")
                .content("Designed and tested a low-cost autonomous delivery rover specifically calibrated for RGUKT RK Valley hilly terrain. Successfully tested delivering internal courier packets between Academic Block 1 and Central Library.")
                .type(Post.Type.INNOVATION)
                .branch(User.Branch.CSE)
                .campus(User.Campus.RK_Valley)
                .visibility(Post.Visibility.PUBLIC)
                .likesCount(42)
                .endorsementsCount(3)
                .status(Post.Status.PUBLISHED)
                .isFeatured(true)
                .build());

        System.out.println("✅ CircuLink MySQL 8 seed data initialized successfully!");
    }
}

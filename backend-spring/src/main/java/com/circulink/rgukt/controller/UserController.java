package com.circulink.rgukt.controller;

import com.circulink.rgukt.dto.AuthDtos.UserDto;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.entity.UserFollower;
import com.circulink.rgukt.repository.CommonRepositories.UserFollowerRepository;
import com.circulink.rgukt.repository.UserRepository;
import com.circulink.rgukt.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserFollowerRepository followerRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String campus,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {

        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit);
        Page<User> usersPage = userRepository.findAll(pageable);
        List<UserDto> dtoList = usersPage.getContent().stream().map(authService::toUserDto).toList();

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("count", dtoList.size());
        res.put("total", usersPage.getTotalElements());
        res.put("pages", usersPage.getTotalPages());
        res.put("users", dtoList);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow();
        return ResponseEntity.ok(Map.of("success", true, "user", authService.toUserDto(user)));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {

        if (body != null) {
            if (body.containsKey("name")) user.setName((String) body.get("name"));
            if (body.containsKey("bio")) user.setBio((String) body.get("bio"));
            if (body.containsKey("phone")) user.setPhone((String) body.get("phone"));
            if (body.containsKey("theme")) user.setTheme(User.Theme.valueOf(((String) body.get("theme")).toLowerCase()));
            if (body.containsKey("language")) user.setLanguage(User.Language.valueOf(((String) body.get("language")).toLowerCase()));
        }

        if (file != null && !file.isEmpty()) {
            File dir = new File("uploads");
            if (!dir.exists()) dir.mkdirs();
            String filename = UUID.randomUUID() + "-" + file.getOriginalFilename();
            file.transferTo(new File(dir, filename));
            user.setProfilePicture("/uploads/" + filename);
        }

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("success", true, "user", authService.toUserDto(user)));
    }

    @PostMapping("/{id}/follow")
    public ResponseEntity<Map<String, Object>> toggleFollow(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser.getId().equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Cannot follow yourself."));
        }

        boolean alreadyFollowing = followerRepository.existsByFollowerIdAndFollowingId(currentUser.getId(), id);
        if (alreadyFollowing) {
            followerRepository.deleteByFollowerIdAndFollowingId(currentUser.getId(), id);
            return ResponseEntity.ok(Map.of("success", true, "following", false));
        } else {
            followerRepository.save(UserFollower.builder()
                    .followerId(currentUser.getId())
                    .followingId(id)
                    .build());
            return ResponseEntity.ok(Map.of("success", true, "following", true));
        }
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<Map<String, Object>> getLeaderboard(
            @RequestParam(required = false) String campus,
            @RequestParam(required = false) String branch,
            @RequestParam(defaultValue = "10") int limit) {

        User.Campus c = (campus != null && !campus.equalsIgnoreCase("ALL")) ? User.Campus.fromString(campus) : null;
        User.Branch b = (branch != null && !branch.equalsIgnoreCase("ALL")) ? User.Branch.valueOf(branch.toUpperCase()) : null;

        Page<User> topUsers = userRepository.findLeaderboard(c, b, PageRequest.of(0, limit));
        List<UserDto> dtoList = topUsers.getContent().stream().map(authService::toUserDto).toList();

        return ResponseEntity.ok(Map.of("success", true, "leaderboard", dtoList));
    }
}

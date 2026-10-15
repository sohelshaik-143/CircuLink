package com.circulink.rgukt.controller;

import com.circulink.rgukt.dto.PostDtos.*;
import com.circulink.rgukt.entity.User;
import com.circulink.rgukt.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<PostFeedResponse> getPosts(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String campus,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "newest") String sort) {

        PostFeedResponse res = postService.getPosts(currentUser, branch, campus, topic, type, search, page, limit, sort);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SinglePostResponse> getPost(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        SinglePostResponse res = postService.getPost(id, currentUser);
        return ResponseEntity.ok(res);
    }

    @PostMapping
    public ResponseEntity<SinglePostResponse> createPost(
            @AuthenticationPrincipal User author,
            @RequestBody PostCreateRequest req) {

        SinglePostResponse res = postService.createPost(req, null, author);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PostMapping("/upload")
    public ResponseEntity<SinglePostResponse> createPostWithFile(
            @AuthenticationPrincipal User author,
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "branch", required = false) String branch,
            @RequestParam(value = "campus", required = false) String campus,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {

        String fileUrl = null;
        if (file != null && !file.isEmpty()) {
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();
            String ext = file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")
                    ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."))
                    : ".jpg";
            String filename = UUID.randomUUID() + ext;
            file.transferTo(new File(dir, filename));
            fileUrl = "/uploads/" + filename;
        }

        PostCreateRequest req = PostCreateRequest.builder()
                .title(title)
                .content(content)
                .type(type)
                .branch(branch)
                .campus(campus)
                .build();

        SinglePostResponse res = postService.createPost(req, fileUrl, author);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> likePost(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(postService.toggleLike(id, user));
    }

    @PostMapping("/{id}/endorse")
    public ResponseEntity<Map<String, Object>> endorsePost(
            @PathVariable Long id,
            @RequestBody EndorseRequest req,
            @AuthenticationPrincipal User faculty) {

        return ResponseEntity.ok(postService.endorsePost(id, req.getMessage(), faculty));
    }

    @PostMapping("/{id}/comment")
    public ResponseEntity<Map<String, Object>> addComment(
            @PathVariable Long id,
            @RequestBody CommentRequest req,
            @AuthenticationPrincipal User author) {

        Map<String, Object> res = postService.addComment(id, req, author);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }
}

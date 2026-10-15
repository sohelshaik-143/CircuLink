package com.circulink.rgukt.service;

import com.circulink.rgukt.dto.PostDtos.*;
import com.circulink.rgukt.entity.*;
import com.circulink.rgukt.repository.AuditLogRepository;
import com.circulink.rgukt.repository.CommonRepositories.CommentRepository;
import com.circulink.rgukt.repository.CommonRepositories.PostEndorsementRepository;
import com.circulink.rgukt.repository.CommonRepositories.PostLikeRepository;
import com.circulink.rgukt.repository.PostRepository;
import com.circulink.rgukt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostEndorsementRepository endorsementRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final GamificationService gamificationService;
    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public PostFeedResponse getPosts(User currentUser, String branch, String campus,
                                    String topic, String type, String search,
                                    int page, int limit, String sort) {
        Sort sortObj = switch (sort != null ? sort : "newest") {
            case "oldest" -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "trending" -> Sort.by(Sort.Direction.DESC, "likesCount", "views");
            case "most_endorsed" -> Sort.by(Sort.Direction.DESC, "endorsementsCount");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };

        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, sortObj);

        Specification<Post> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), Post.Status.PUBLISHED));

            if (branch != null && !branch.equalsIgnoreCase("ALL")) {
                predicates.add(cb.equal(root.get("branch"), User.Branch.valueOf(branch.toUpperCase())));
            }
            if (campus != null && !campus.equalsIgnoreCase("ALL")) {
                predicates.add(cb.equal(root.get("campus"), User.Campus.fromString(campus)));
            }
            if (type != null && !type.isBlank()) {
                predicates.add(cb.equal(root.get("type"), Post.Type.valueOf(type.toUpperCase())));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase().trim() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("content")), like)
                ));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<Post> pageResult = postRepository.findAll(spec, pageable);

        List<PostDto> dtoList = pageResult.getContent().stream().map(p -> {
            boolean isLiked = currentUser != null && postLikeRepository.existsByPostIdAndUserId(p.getId(), currentUser.getId());
            return toPostDto(p, isLiked);
        }).toList();

        return PostFeedResponse.builder()
                .success(true)
                .count(dtoList.size())
                .total(pageResult.getTotalElements())
                .pages(pageResult.getTotalPages())
                .currentPage(page)
                .posts(dtoList)
                .build();
    }

    @Transactional
    public SinglePostResponse getPost(Long id, User currentUser) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Post not found."));

        post.setViews(post.getViews() + 1);
        postRepository.save(post);

        boolean isLiked = currentUser != null && postLikeRepository.existsByPostIdAndUserId(post.getId(), currentUser.getId());
        return SinglePostResponse.builder()
                .success(true)
                .post(toPostDto(post, isLiked))
                .build();
    }

    @Transactional
    public SinglePostResponse createPost(PostCreateRequest req, String fileUrl, User author) {
        Post post = Post.builder()
                .author(author)
                .title(req.getTitle())
                .content(req.getContent())
                .type(req.getType() != null ? Post.Type.valueOf(req.getType().toUpperCase()) : Post.Type.GENERAL)
                .branch(req.getBranch() != null ? User.Branch.valueOf(req.getBranch().toUpperCase()) : author.getBranch())
                .campus(req.getCampus() != null ? User.Campus.fromString(req.getCampus()) : author.getCampus())
                .visibility(req.getVisibility() != null ? Post.Visibility.valueOf(req.getVisibility().toUpperCase()) : Post.Visibility.PUBLIC)
                .thumbnailUrl(fileUrl)
                .status(Post.Status.PUBLISHED)
                .build();

        post = postRepository.save(post);

        gamificationService.awardPoints(author.getId(), "CREATE_POST");
        gamificationService.checkAndAwardBadges(author.getId());

        auditLogRepository.save(AuditLog.builder()
                .user(author)
                .action("CREATE_POST")
                .resourceType("Post")
                .resourceId(post.getId())
                .campus(author.getCampus().name())
                .build());

        return SinglePostResponse.builder()
                .success(true)
                .post(toPostDto(post, false))
                .build();
    }

    @Transactional
    public Map<String, Object> toggleLike(Long postId, User user) {
        Post post = postRepository.findById(postId).orElseThrow();
        boolean alreadyLiked = postLikeRepository.existsByPostIdAndUserId(postId, user.getId());

        if (alreadyLiked) {
            postLikeRepository.deleteByPostIdAndUserId(postId, user.getId());
            post.setLikesCount(Math.max(0, post.getLikesCount() - 1));
        } else {
            postLikeRepository.save(PostLike.builder()
                    .postId(postId)
                    .userId(user.getId())
                    .post(post)
                    .user(user)
                    .build());
            post.setLikesCount(post.getLikesCount() + 1);

            if (!post.getAuthor().getId().equals(user.getId())) {
                notificationService.sendToUser(post.getAuthor(), user, "POST_LIKED",
                        "Your post was liked",
                        user.getName() + " liked your post \"" + post.getTitle() + "\"",
                        "/posts/" + post.getId());
                gamificationService.awardPoints(post.getAuthor().getId(), "LIKE_RECEIVED");
            }
        }
        postRepository.save(post);

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("liked", !alreadyLiked);
        res.put("likesCount", post.getLikesCount());
        return res;
    }

    @Transactional
    public Map<String, Object> endorsePost(Long postId, String message, User faculty) {
        Set<User.Role> canEndorse = Set.of(User.Role.FACULTY, User.Role.HOD, User.Role.DEAN, User.Role.DIRECTOR, User.Role.DSW);
        if (!canEndorse.contains(faculty.getRole())) {
            throw new IllegalStateException("Only faculty and academic officials can endorse posts.");
        }

        Post post = postRepository.findById(postId).orElseThrow();
        if (endorsementRepository.existsByPostIdAndFacultyId(postId, faculty.getId())) {
            throw new IllegalArgumentException("Already endorsed.");
        }

        endorsementRepository.save(PostEndorsement.builder()
                .post(post)
                .faculty(faculty)
                .message(message)
                .weight(2)
                .build());

        post.setEndorsementsCount(post.getEndorsementsCount() + 1);
        postRepository.save(post);

        gamificationService.awardPoints(post.getAuthor().getId(), "ENDORSE_RECEIVED");
        gamificationService.checkAndAwardBadges(post.getAuthor().getId());

        notificationService.sendToUser(post.getAuthor(), faculty, "POST_ENDORSED",
                "Your post was endorsed!",
                faculty.getName() + " (" + faculty.getRole() + ") endorsed your post \"" + post.getTitle() + "\"",
                "/posts/" + post.getId());

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Post endorsed.");
        res.put("endorsementsCount", post.getEndorsementsCount());
        return res;
    }

    @Transactional
    public Map<String, Object> addComment(Long postId, CommentRequest req, User author) {
        Post post = postRepository.findById(postId).orElseThrow();

        Comment comment = Comment.builder()
                .post(post)
                .author(author)
                .content(req.getContent())
                .build();

        if (req.getParentComment() != null) {
            Comment parent = commentRepository.findById(req.getParentComment()).orElse(null);
            comment.setParentComment(parent);
        }

        comment = commentRepository.save(comment);
        gamificationService.awardPoints(author.getId(), "COMMENT");

        if (!post.getAuthor().getId().equals(author.getId())) {
            notificationService.sendToUser(post.getAuthor(), author, "POST_COMMENTED",
                    "New comment on your post",
                    author.getName() + " commented on \"" + post.getTitle() + "\"",
                    "/posts/" + post.getId());
        }

        AuthorDto authorDto = AuthorDto.builder()
                .id(author.getId())
                .name(author.getName())
                .collegeId(author.getCollegeId())
                .role(author.getRole().name())
                .profilePicture(author.getProfilePicture())
                .build();

        CommentDto dto = CommentDto.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .author(authorDto)
                .createdAt(comment.getCreatedAt())
                .isEdited(false)
                .build();

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("comment", dto);
        return res;
    }

    public PostDto toPostDto(Post p, boolean isLiked) {
        AuthorDto authorDto = AuthorDto.builder()
                .id(p.getAuthor().getId())
                .name(p.getAuthor().getName())
                .collegeId(p.getAuthor().getCollegeId())
                .role(p.getAuthor().getRole().name())
                .branch(p.getAuthor().getBranch() != null ? p.getAuthor().getBranch().name() : null)
                .campus(p.getAuthor().getCampus().getDisplayName())
                .profilePicture(p.getAuthor().getProfilePicture())
                .level(p.getAuthor().getLevel().name())
                .build();

        List<CommentDto> commentDtos = new ArrayList<>();
        if (p.getComments() != null) {
            for (Comment c : p.getComments()) {
                AuthorDto cAuthor = AuthorDto.builder()
                        .id(c.getAuthor().getId())
                        .name(c.getAuthor().getName())
                        .collegeId(c.getAuthor().getCollegeId())
                        .role(c.getAuthor().getRole().name())
                        .profilePicture(c.getAuthor().getProfilePicture())
                        .build();

                commentDtos.add(CommentDto.builder()
                        .id(c.getId())
                        .content(c.getContent())
                        .author(cAuthor)
                        .createdAt(c.getCreatedAt())
                        .isEdited(c.getIsEdited())
                        .build());
            }
        }

        List<EndorsementDto> endorsementDtos = new ArrayList<>();
        if (p.getEndorsements() != null) {
            for (PostEndorsement pe : p.getEndorsements()) {
                AuthorDto facultyDto = AuthorDto.builder()
                        .id(pe.getFaculty().getId())
                        .name(pe.getFaculty().getName())
                        .role(pe.getFaculty().getRole().name())
                        .build();

                endorsementDtos.add(EndorsementDto.builder()
                        .user(facultyDto)
                        .message(pe.getMessage())
                        .createdAt(pe.getCreatedAt())
                        .build());
            }
        }

        List<String> topics = p.getTopics() != null ? p.getTopics().stream().map(PostTopic::getTopic).toList() : List.of();
        List<String> tags = p.getTags() != null ? p.getTags().stream().map(PostTag::getTag).toList() : List.of();

        return PostDto.builder()
                .id(p.getId())
                .title(p.getTitle())
                .content(p.getContent())
                .type(p.getType().name())
                .topics(topics)
                .tags(tags)
                .branch(p.getBranch().name())
                .campus(p.getCampus().getDisplayName())
                .visibility(p.getVisibility().name())
                .thumbnailUrl(p.getThumbnailUrl())
                .author(authorDto)
                .likesCount(p.getLikesCount())
                .endorsementsCount(p.getEndorsementsCount())
                .shares(p.getShares())
                .views(p.getViews())
                .status(p.getStatus().name())
                .isFeatured(p.getIsFeatured())
                .isPinned(p.getIsPinned())
                .isLiked(isLiked)
                .comments(commentDtos)
                .endorsements(endorsementDtos)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}

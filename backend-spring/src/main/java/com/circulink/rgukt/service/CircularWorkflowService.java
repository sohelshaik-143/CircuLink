package com.circulink.rgukt.service;

import com.circulink.rgukt.dto.CircularDtos.*;
import com.circulink.rgukt.dto.PostDtos.AuthorDto;
import com.circulink.rgukt.entity.*;
import com.circulink.rgukt.repository.AuditLogRepository;
import com.circulink.rgukt.repository.CircularRepository;
import com.circulink.rgukt.repository.CommonRepositories.CircularApprovalRepository;
import com.circulink.rgukt.repository.CommonRepositories.CircularReadReceiptRepository;
import com.circulink.rgukt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CircularWorkflowService {

    private final CircularRepository circularRepository;
    private final CircularApprovalRepository approvalRepository;
    private final CircularReadReceiptRepository readReceiptRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public CircularFeedResponse getCirculars(User currentUser, String branch, String campus,
                                            String category, String priority, String status,
                                            String search, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<Circular> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            // Role-based visibility rules
            if (currentUser.getRole() == User.Role.STUDENT) {
                predicates.add(cb.equal(root.get("status"), Circular.Status.PUBLISHED));
                predicates.add(cb.equal(root.get("isActive"), true));
            } else if (currentUser.getRole() == User.Role.FACULTY) {
                predicates.add(root.get("status").in(Circular.Status.PUBLISHED, Circular.Status.PENDING_HOD));
            } else if (currentUser.getRole() == User.Role.HOD) {
                predicates.add(root.get("status").in(Circular.Status.PUBLISHED, Circular.Status.PENDING_HOD, Circular.Status.PENDING_DEAN));
            } else if (currentUser.getRole() == User.Role.DEAN || currentUser.getRole() == User.Role.DSW) {
                predicates.add(root.get("status").in(Circular.Status.PUBLISHED, Circular.Status.PENDING_DEAN, Circular.Status.PENDING_DIRECTOR));
            } else {
                // DIRECTOR, ADMIN, SECURITY can filter freely
                if (status != null && !status.isBlank()) {
                    predicates.add(cb.equal(root.get("status"), Circular.Status.valueOf(status.toUpperCase())));
                }
            }

            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), Circular.Category.valueOf(category.toUpperCase())));
            }
            if (priority != null && !priority.isBlank()) {
                predicates.add(cb.equal(root.get("priority"), Circular.Priority.valueOf(priority.toUpperCase())));
            }
            if (search != null && !search.isBlank()) {
                String searchLike = "%" + search.toLowerCase().trim() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), searchLike),
                        cb.like(cb.lower(root.get("content")), searchLike)
                ));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<Circular> pageResult = circularRepository.findAll(spec, pageable);

        int unreadCount = 0;
        List<CircularDto> dtoList = new ArrayList<>();
        for (Circular c : pageResult.getContent()) {
            boolean isRead = readReceiptRepository.existsByCircularIdAndUserId(c.getId(), currentUser.getId());
            if (!isRead) unreadCount++;
            dtoList.add(toCircularDto(c, isRead));
        }

        return CircularFeedResponse.builder()
                .success(true)
                .count(dtoList.size())
                .total(pageResult.getTotalElements())
                .pages(pageResult.getTotalPages())
                .unreadCount(unreadCount)
                .circulars(dtoList)
                .build();
    }

    @Transactional
    public SingleCircularResponse createCircular(CircularCreateRequest req, User author) {
        String role = author.getRole().name();
        Circular.Status initialStatus;

        if (author.getRole() == User.Role.STUDENT || author.getRole() == User.Role.FACULTY) {
            initialStatus = Circular.Status.PENDING_HOD;
        } else if (author.getRole() == User.Role.HOD) {
            initialStatus = Circular.Status.PENDING_DEAN;
        } else if (author.getRole() == User.Role.DSW || author.getRole() == User.Role.DEAN) {
            initialStatus = Circular.Status.PENDING_DIRECTOR;
        } else {
            // DIRECTOR, ADMIN auto-publishes
            initialStatus = Circular.Status.PUBLISHED;
        }

        long count = circularRepository.count();
        int year = Calendar.getInstance().get(Calendar.YEAR);
        String circularNum = String.format("RGUKT/%d/%04d", year, count + 1);

        Circular circular = Circular.builder()
                .circularNumber(circularNum)
                .author(author)
                .authorRole(role)
                .title(req.getTitle())
                .content(req.getContent())
                .category(Circular.Category.valueOf(req.getCategory().toUpperCase()))
                .priority(req.getPriority() != null ? Circular.Priority.valueOf(req.getPriority().toUpperCase()) : Circular.Priority.MEDIUM)
                .status(initialStatus)
                .requiresAcknowledgment(Boolean.TRUE.equals(req.getRequiresAcknowledgment()))
                .publishDate(initialStatus == Circular.Status.PUBLISHED ? Instant.now() : null)
                .expiryDate(req.getExpiryDate())
                .isActive(true)
                .build();

        circular = circularRepository.save(circular);

        // Build 3-step approval chain
        List<CircularApproval> chain = new ArrayList<>();
        chain.add(CircularApproval.builder()
                .circular(circular)
                .stepOrder(0)
                .role(CircularApproval.Role.HOD)
                .status(initialStatus == Circular.Status.PENDING_HOD ? CircularApproval.Status.PENDING : CircularApproval.Status.APPROVED)
                .approvedBy(initialStatus != Circular.Status.PENDING_HOD ? author : null)
                .actionAt(initialStatus != Circular.Status.PENDING_HOD ? Instant.now() : null)
                .build());

        chain.add(CircularApproval.builder()
                .circular(circular)
                .stepOrder(1)
                .role(CircularApproval.Role.DEAN)
                .status(initialStatus == Circular.Status.PENDING_DIRECTOR || initialStatus == Circular.Status.PUBLISHED ? CircularApproval.Status.APPROVED : CircularApproval.Status.PENDING)
                .approvedBy(initialStatus == Circular.Status.PENDING_DIRECTOR || initialStatus == Circular.Status.PUBLISHED ? author : null)
                .actionAt(initialStatus == Circular.Status.PENDING_DIRECTOR || initialStatus == Circular.Status.PUBLISHED ? Instant.now() : null)
                .build());

        chain.add(CircularApproval.builder()
                .circular(circular)
                .stepOrder(2)
                .role(CircularApproval.Role.DIRECTOR)
                .status(initialStatus == Circular.Status.PUBLISHED ? CircularApproval.Status.APPROVED : CircularApproval.Status.PENDING)
                .approvedBy(initialStatus == Circular.Status.PUBLISHED ? author : null)
                .actionAt(initialStatus == Circular.Status.PUBLISHED ? Instant.now() : null)
                .build());

        approvalRepository.saveAll(chain);
        circular.setApprovalChain(chain);

        // Notify next approver tier
        if (initialStatus == Circular.Status.PENDING_HOD) {
            List<User> hods = userRepository.findByRoleAndCampusAndIsActiveTrue(User.Role.HOD, author.getCampus());
            notificationService.sendToMany(hods, author, "APPROVAL_REQUIRED",
                    "📋 Circular Awaiting Your Approval",
                    "\"" + circular.getTitle() + "\" needs your review as HOD.");
        } else if (initialStatus == Circular.Status.PENDING_DEAN) {
            List<User> deans = userRepository.findByRoleAndIsActiveTrue(User.Role.DEAN);
            notificationService.sendToMany(deans, author, "APPROVAL_REQUIRED",
                    "📋 Circular Awaiting Your Approval",
                    "\"" + circular.getTitle() + "\" needs your review as Dean.");
        } else if (initialStatus == Circular.Status.PENDING_DIRECTOR) {
            List<User> directors = userRepository.findByRoleAndIsActiveTrue(User.Role.DIRECTOR);
            notificationService.sendToMany(directors, author, "APPROVAL_REQUIRED",
                    "📋 Circular Awaiting Your Approval",
                    "\"" + circular.getTitle() + "\" needs your review as Director.");
        }

        // Audit Log
        auditLogRepository.save(AuditLog.builder()
                .user(author)
                .action("CREATE_CIRCULAR")
                .resourceType("Circular")
                .resourceId(circular.getId())
                .campus(author.getCampus().name())
                .build());

        return SingleCircularResponse.builder()
                .success(true)
                .message("Circular created.")
                .circular(toCircularDto(circular, false))
                .build();
    }

    @Transactional
    public SingleCircularResponse approveCircular(Long circularId, User approver, String comment) {
        Circular circular = circularRepository.findById(circularId)
                .orElseThrow(() -> new NoSuchElementException("Circular not found."));

        int step;
        if (approver.getRole() == User.Role.HOD) step = 0;
        else if (approver.getRole() == User.Role.DEAN || approver.getRole() == User.Role.DSW) step = 1;
        else if (approver.getRole() == User.Role.DIRECTOR || approver.getRole() == User.Role.ADMIN) step = 2;
        else throw new IllegalStateException("Not authorized to approve circulars.");

        CircularApproval currentApproval = approvalRepository.findByCircularIdAndStepOrder(circularId, step)
                .orElseThrow(() -> new IllegalStateException("Approval step not found."));

        if (currentApproval.getStatus() != CircularApproval.Status.PENDING) {
            throw new IllegalStateException("This approval step is not pending or already actioned.");
        }

        currentApproval.setStatus(CircularApproval.Status.APPROVED);
        currentApproval.setApprovedBy(approver);
        currentApproval.setComment(comment != null ? comment : "");
        currentApproval.setActionAt(Instant.now());
        approvalRepository.save(currentApproval);

        // Advance workflow status
        if (step == 0) {
            circular.setStatus(Circular.Status.PENDING_DEAN);
            List<User> deans = userRepository.findByRoleAndIsActiveTrue(User.Role.DEAN);
            notificationService.sendToMany(deans, approver, "APPROVAL_REQUIRED",
                    "📋 Circular Awaiting Your Approval",
                    "\"" + circular.getTitle() + "\" has been approved by HOD and needs your review.");
        } else if (step == 1) {
            circular.setStatus(Circular.Status.PENDING_DIRECTOR);
            List<User> directors = userRepository.findByRoleAndIsActiveTrue(User.Role.DIRECTOR);
            notificationService.sendToMany(directors, approver, "APPROVAL_REQUIRED",
                    "📋 Circular Awaiting Your Approval",
                    "\"" + circular.getTitle() + "\" has been approved by Dean and needs your review.");
        } else {
            circular.setStatus(Circular.Status.PUBLISHED);
            circular.setPublishDate(Instant.now());
            circular.setIsActive(true);

            // Notify author
            notificationService.sendToUser(circular.getAuthor(), approver, "CIRCULAR_APPROVED",
                    "✅ Your circular is now published!",
                    "\"" + circular.getTitle() + "\" has received final approval from the Director.",
                    "/circulars/" + circular.getId());

            // Realtime WebSocket broadcast
            messagingTemplate.convertAndSend("/topic/new_circular", Map.of(
                    "_id", circular.getId(),
                    "title", circular.getTitle(),
                    "category", circular.getCategory().name()
            ));
        }

        circularRepository.save(circular);

        auditLogRepository.save(AuditLog.builder()
                .user(approver)
                .action("APPROVE_CIRCULAR")
                .resourceType("Circular")
                .resourceId(circular.getId())
                .build());

        return SingleCircularResponse.builder()
                .success(true)
                .message(circular.getStatus() == Circular.Status.PUBLISHED ? "Circular published!" : "Circular advanced to next approval.")
                .circular(toCircularDto(circular, false))
                .build();
    }

    @Transactional
    public SingleCircularResponse rejectCircular(Long circularId, User approver, String reason) {
        Circular circular = circularRepository.findById(circularId)
                .orElseThrow(() -> new NoSuchElementException("Circular not found."));

        circular.setStatus(Circular.Status.REJECTED);
        circular.setRejectedBy(approver);
        circular.setRejectionReason(reason);
        circularRepository.save(circular);

        notificationService.sendToUser(circular.getAuthor(), approver, "CIRCULAR_REJECTED",
                "❌ Circular Rejected",
                "Your circular \"" + circular.getTitle() + "\" was rejected. Reason: " + reason,
                "/circulars/" + circular.getId());

        auditLogRepository.save(AuditLog.builder()
                .user(approver)
                .action("REJECT_CIRCULAR")
                .resourceType("Circular")
                .resourceId(circular.getId())
                .build());

        return SingleCircularResponse.builder()
                .success(true)
                .message("Circular rejected.")
                .circular(toCircularDto(circular, false))
                .build();
    }

    @Transactional
    public void markAsRead(Long circularId, User user) {
        Circular circular = circularRepository.findById(circularId).orElseThrow();
        if (!readReceiptRepository.existsByCircularIdAndUserId(circularId, user.getId())) {
            readReceiptRepository.save(CircularReadReceipt.builder()
                    .circularId(circularId)
                    .userId(user.getId())
                    .circular(circular)
                    .user(user)
                    .build());
        }
    }

    public CircularDto toCircularDto(Circular c, boolean isRead) {
        AuthorDto authorDto = AuthorDto.builder()
                .id(c.getAuthor().getId())
                .name(c.getAuthor().getName())
                .collegeId(c.getAuthor().getCollegeId())
                .role(c.getAuthor().getRole().name())
                .branch(c.getAuthor().getBranch() != null ? c.getAuthor().getBranch().name() : null)
                .campus(c.getAuthor().getCampus().getDisplayName())
                .build();

        List<ApprovalStepDto> approvalDtos = new ArrayList<>();
        if (c.getApprovalChain() != null) {
            for (CircularApproval a : c.getApprovalChain()) {
                AuthorDto approverDto = a.getApprovedBy() != null ? AuthorDto.builder()
                        .id(a.getApprovedBy().getId())
                        .name(a.getApprovedBy().getName())
                        .role(a.getApprovedBy().getRole().name())
                        .build() : null;

                approvalDtos.add(ApprovalStepDto.builder()
                        .role(a.getRole().name())
                        .status(a.getStatus().name())
                        .approvedBy(approverDto)
                        .comment(a.getComment())
                        .actionAt(a.getActionAt())
                        .build());
            }
        }

        return CircularDto.builder()
                .id(c.getId())
                .circularNumber(c.getCircularNumber())
                .title(c.getTitle())
                .content(c.getContent())
                .category(c.getCategory().name())
                .priority(c.getPriority().name())
                .status(c.getStatus().name())
                .author(authorDto)
                .authorRole(c.getAuthorRole())
                .requiresAcknowledgment(c.getRequiresAcknowledgment())
                .isRead(isRead)
                .approvalChain(approvalDtos)
                .publishDate(c.getPublishDate())
                .expiryDate(c.getExpiryDate())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}

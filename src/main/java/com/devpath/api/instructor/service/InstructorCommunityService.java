package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.community.CommunityCommentDetailResponse;
import com.devpath.api.instructor.dto.community.CommunityCommentRequest;
import com.devpath.api.instructor.dto.community.CommunityCommentResponse;
import com.devpath.api.instructor.dto.community.CommunityPostDetailResponse;
import com.devpath.api.instructor.dto.community.CommunityPostRequest;
import com.devpath.api.instructor.dto.community.CommunityPostResponse;
import com.devpath.api.instructor.dto.community.CommunitySummaryResponse;
import com.devpath.api.instructor.entity.InstructorComment;
import com.devpath.api.instructor.entity.InstructorCommentLike;
import com.devpath.api.instructor.entity.InstructorPost;
import com.devpath.api.instructor.entity.InstructorPostLike;
import com.devpath.api.instructor.repository.InstructorCommentLikeRepository;
import com.devpath.api.instructor.repository.InstructorCommentRepository;
import com.devpath.api.instructor.repository.InstructorPostLikeRepository;
import com.devpath.api.instructor.repository.InstructorPostRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorCommunityService {

    private final InstructorPostRepository postRepository;
    private final InstructorCommentRepository commentRepository;
    private final InstructorPostLikeRepository postLikeRepository;
    private final InstructorCommentLikeRepository commentLikeRepository;

    public CommunityPostResponse createPost(Long instructorId, CommunityPostRequest request) {
        InstructorPost post = InstructorPost.builder()
                .instructorId(instructorId)
                .title(request.getTitle())
                .content(request.getContent())
                .postType(normalizePostType(request.getPostType()))
                .build();

        return CommunityPostResponse.from(postRepository.save(post));
    }

    public CommunityPostResponse updatePost(Long instructorId, Long postId, CommunityPostRequest request) {
        InstructorPost post = getActivePost(postId);
        validatePostOwner(post, instructorId);

        post.updatePost(
                request.getTitle(),
                request.getContent(),
                normalizePostType(request.getPostType())
        );
        return CommunityPostResponse.from(post);
    }

    public void deletePost(Long instructorId, Long postId) {
        InstructorPost post = getActivePost(postId);
        validatePostOwner(post, instructorId);
        post.delete();
    }

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> getPosts(Long instructorId, String sort, String type) {
        String normalizedSort = normalizeSort(sort);
        String normalizedType = normalizeOptionalPostType(type);

        boolean popular = "popular".equals(normalizedSort);
        List<InstructorPost> posts;

        if (normalizedType != null) {
            posts = popular
                    ? postRepository.findByInstructorIdAndPostTypeAndIsDeletedFalseOrderByLikeCountDesc(
                            instructorId,
                            normalizedType
                    )
                    : postRepository.findByInstructorIdAndPostTypeAndIsDeletedFalseOrderByCreatedAtDesc(
                            instructorId,
                            normalizedType
                    );
        } else {
            posts = popular
                    ? postRepository.findByInstructorIdAndIsDeletedFalseOrderByLikeCountDesc(instructorId)
                    : postRepository.findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(instructorId);
        }

        return posts.stream()
                .map(CommunityPostResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CommunityPostDetailResponse getPostDetail(Long postId) {
        InstructorPost post = getActivePost(postId);
        List<InstructorComment> comments = commentRepository.findByPostIdAndIsDeletedFalseOrderByCreatedAtAsc(postId);

        Map<Long, CommunityCommentDetailResponse> indexed = new LinkedHashMap<>();
        List<CommunityCommentDetailResponse> roots = new ArrayList<>();

        for (InstructorComment comment : comments) {
            indexed.put(comment.getId(), CommunityCommentDetailResponse.from(comment));
        }

        for (InstructorComment comment : comments) {
            CommunityCommentDetailResponse current = indexed.get(comment.getId());

            if (comment.getParentCommentId() == null) {
                roots.add(current);
                continue;
            }

            CommunityCommentDetailResponse parent = indexed.get(comment.getParentCommentId());
            if (parent == null) {
                roots.add(current);
                continue;
            }

            parent.addReply(current);
        }

        return CommunityPostDetailResponse.from(post, roots);
    }

    public CommunityCommentResponse addComment(Long postId, Long authorId, CommunityCommentRequest request) {
        InstructorPost post = getActivePost(postId);

        InstructorComment comment = InstructorComment.builder()
                .postId(postId)
                .authorId(authorId)
                .content(request.getContent())
                .build();

        InstructorComment saved = commentRepository.save(comment);
        post.incrementCommentCount();

        return CommunityCommentResponse.from(saved);
    }

    public CommunityCommentResponse addReply(Long commentId, Long authorId, CommunityCommentRequest request) {
        InstructorComment parent = getActiveComment(commentId);
        InstructorPost post = getActivePost(parent.getPostId());

        InstructorComment reply = InstructorComment.builder()
                .postId(parent.getPostId())
                .authorId(authorId)
                .parentCommentId(commentId)
                .content(request.getContent())
                .build();

        InstructorComment saved = commentRepository.save(reply);
        post.incrementCommentCount();

        return CommunityCommentResponse.from(saved);
    }

    public CommunityCommentResponse updateComment(Long userId, Long commentId, CommunityCommentRequest request) {
        InstructorComment comment = getActiveComment(commentId);
        validateCommentAuthor(comment, userId);

        comment.updateContent(request.getContent());
        return CommunityCommentResponse.from(comment);
    }

    public void deleteComment(Long userId, Long commentId) {
        InstructorComment comment = getActiveComment(commentId);
        validateCommentAuthor(comment, userId);

        List<InstructorComment> replies = commentRepository.findAllByParentCommentIdAndIsDeletedFalse(commentId);

        comment.delete();
        replies.forEach(InstructorComment::delete);

        InstructorPost post = getActivePost(comment.getPostId());
        post.decrementCommentCount(1 + replies.size());
    }

    public void togglePostLike(Long postId, Long userId) {
        InstructorPost post = getActivePost(postId);

        postLikeRepository.findByPostIdAndUserId(postId, userId).ifPresentOrElse(
                like -> {
                    postLikeRepository.delete(like);
                    post.decrementLikeCount();
                },
                () -> {
                    postLikeRepository.save(
                            InstructorPostLike.builder()
                                    .postId(postId)
                                    .userId(userId)
                                    .build()
                    );
                    post.incrementLikeCount();
                }
        );
    }

    public void toggleCommentLike(Long commentId, Long userId) {
        InstructorComment comment = getActiveComment(commentId);

        commentLikeRepository.findByCommentIdAndUserId(commentId, userId).ifPresentOrElse(
                like -> {
                    commentLikeRepository.delete(like);
                    comment.decrementLikeCount();
                },
                () -> {
                    commentLikeRepository.save(
                            InstructorCommentLike.builder()
                                    .commentId(commentId)
                                    .userId(userId)
                                    .build()
                    );
                    comment.incrementLikeCount();
                }
        );
    }

    @Transactional(readOnly = true)
    public CommunitySummaryResponse getSummary(Long instructorId) {
        long totalPostCount = postRepository.countByInstructorIdAndIsDeletedFalse(instructorId);

        List<Long> postIds = postRepository.findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(instructorId)
                .stream()
                .map(InstructorPost::getId)
                .collect(Collectors.toList());

        long totalCommentCount = postIds.isEmpty()
                ? 0
                : commentRepository.countByPostIdInAndIsDeletedFalse(postIds);

        long postLikeCount = postIds.isEmpty()
                ? 0
                : postLikeRepository.countByPostIdIn(postIds);

        List<Long> commentIds = postIds.isEmpty()
                ? List.of()
                : commentRepository.findAllByPostIdInAndIsDeletedFalse(postIds)
                        .stream()
                        .map(InstructorComment::getId)
                        .toList();

        long commentLikeCount = commentIds.isEmpty()
                ? 0
                : commentLikeRepository.countByCommentIdIn(commentIds);

        long recentPostCount = postRepository.countByInstructorIdAndIsDeletedFalseAndCreatedAtAfter(
                instructorId,
                LocalDateTime.now().minusDays(7)
        );

        return CommunitySummaryResponse.builder()
                .totalPostCount(totalPostCount)
                .totalCommentCount(totalCommentCount)
                .totalLikeCount(postLikeCount + commentLikeCount)
                .recentPostCount(recentPostCount)
                .build();
    }

    private InstructorPost getActivePost(Long postId) {
        return postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
    }

    private InstructorComment getActiveComment(Long commentId) {
        return commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private void validatePostOwner(InstructorPost post, Long instructorId) {
        if (!post.getInstructorId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
    }

    private void validateCommentAuthor(InstructorComment comment, Long userId) {
        if (!comment.getAuthorId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
    }

    private String normalizeSort(String sort) {
        String normalized = sort == null ? "latest" : sort.trim().toLowerCase(Locale.ROOT);
        if (!normalized.equals("latest") && !normalized.equals("popular")) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return normalized;
    }

    private String normalizePostType(String postType) {
        String normalized = normalizeOptionalPostType(postType);
        return normalized == null ? "GENERAL" : normalized;
    }

    private String normalizeOptionalPostType(String postType) {
        if (postType == null || postType.isBlank()) {
            return null;
        }

        String normalized = postType.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("NOTICE") && !normalized.equals("GENERAL")) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return normalized;
    }
}

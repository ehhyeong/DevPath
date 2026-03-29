package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.community.*;
import com.devpath.api.instructor.entity.*;
import com.devpath.api.instructor.repository.*;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

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
                .postType(request.getPostType())
                .build();
        return CommunityPostResponse.from(postRepository.save(post));
    }

    public CommunityPostResponse updatePost(Long instructorId, Long postId, CommunityPostRequest request) {
        InstructorPost post = getActivePost(postId);
        if (!post.getInstructorId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        post.updatePost(request.getTitle(), request.getContent(), request.getPostType());
        return CommunityPostResponse.from(post);
    }

    public void deletePost(Long instructorId, Long postId) {
        InstructorPost post = getActivePost(postId);
        if (!post.getInstructorId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        post.delete();
    }

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> getPosts(Long instructorId, String sort, String type) {
        List<InstructorPost> posts;
        boolean isPopular = "popular".equalsIgnoreCase(sort);

        if (type != null && !type.isBlank()) {
            posts = isPopular
                    ? postRepository.findByInstructorIdAndPostTypeAndIsDeletedFalseOrderByLikeCountDesc(instructorId, type)
                    : postRepository.findByInstructorIdAndPostTypeAndIsDeletedFalseOrderByCreatedAtDesc(instructorId, type);
        } else {
            posts = isPopular
                    ? postRepository.findByInstructorIdAndIsDeletedFalseOrderByLikeCountDesc(instructorId)
                    : postRepository.findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(instructorId);
        }

        return posts.stream().map(CommunityPostResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CommunityPostResponse getPost(Long postId) {
        return CommunityPostResponse.from(getActivePost(postId));
    }

    public CommunityCommentResponse addComment(Long postId, Long authorId, CommunityCommentRequest request) {
        getActivePost(postId);
        InstructorComment comment = InstructorComment.builder()
                .postId(postId)
                .authorId(authorId)
                .content(request.getContent())
                .build();
        InstructorComment saved = commentRepository.save(comment);
        postRepository.findByIdAndIsDeletedFalse(postId).ifPresent(InstructorPost::incrementCommentCount);
        return CommunityCommentResponse.from(saved);
    }

    public CommunityCommentResponse updateComment(Long userId, Long commentId, CommunityCommentRequest request) {
        InstructorComment comment = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!comment.getAuthorId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        comment.updateContent(request.getContent());
        return CommunityCommentResponse.from(comment);
    }

    public void deleteComment(Long userId, Long commentId) {
        InstructorComment comment = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!comment.getAuthorId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        comment.delete();
    }

    public CommunityCommentResponse addReply(Long commentId, Long authorId, CommunityCommentRequest request) {
        InstructorComment parent = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        InstructorComment reply = InstructorComment.builder()
                .postId(parent.getPostId())
                .authorId(authorId)
                .parentCommentId(commentId)
                .content(request.getContent())
                .build();
        return CommunityCommentResponse.from(commentRepository.save(reply));
    }

    public void togglePostLike(Long postId, Long userId) {
        InstructorPost post = getActivePost(postId);
        postLikeRepository.findByPostIdAndUserId(postId, userId).ifPresentOrElse(
                like -> {
                    postLikeRepository.delete(like);
                    post.decrementLikeCount();
                },
                () -> {
                    postLikeRepository.save(InstructorPostLike.builder().postId(postId).userId(userId).build());
                    post.incrementLikeCount();
                }
        );
    }

    public void toggleCommentLike(Long commentId, Long userId) {
        InstructorComment comment = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        commentLikeRepository.findByCommentIdAndUserId(commentId, userId).ifPresentOrElse(
                like -> {
                    commentLikeRepository.delete(like);
                    comment.decrementLikeCount();
                },
                () -> {
                    commentLikeRepository.save(InstructorCommentLike.builder().commentId(commentId).userId(userId).build());
                    comment.incrementLikeCount();
                }
        );
    }

    @Transactional(readOnly = true)
    public CommunitySummaryResponse getSummary(Long instructorId) {
        long totalPostCount = postRepository.countByInstructorIdAndIsDeletedFalse(instructorId);
        List<Long> postIds = postRepository.findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(instructorId)
                .stream().map(InstructorPost::getId).collect(Collectors.toList());
        long totalCommentCount = postIds.isEmpty() ? 0 : commentRepository.countByPostIdInAndIsDeletedFalse(postIds);
        long totalLikeCount = postIds.isEmpty() ? 0 : postLikeRepository.countByPostIdIn(postIds);
        long recentPostCount = postRepository.countByInstructorIdAndIsDeletedFalseAndCreatedAtAfter(
                instructorId, LocalDateTime.now().minusDays(7));

        return CommunitySummaryResponse.builder()
                .totalPostCount(totalPostCount)
                .totalCommentCount(totalCommentCount)
                .totalLikeCount(totalLikeCount)
                .recentPostCount(recentPostCount)
                .build();
    }

    private InstructorPost getActivePost(Long postId) {
        return postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
    }
}
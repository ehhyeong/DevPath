package com.devpath.api.community.service;

import com.devpath.api.community.dto.CommentCreateRequest;
import com.devpath.api.community.dto.CommentResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.community.entity.Comment;
import com.devpath.domain.community.entity.Post;
import com.devpath.domain.community.repository.CommentRepository;
import com.devpath.domain.community.repository.PostRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityCommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public CommentResponse createComment(Long userId, Long postId, CommentCreateRequest request) {
        User user = getUser(userId);
        Post post = getActivePost(postId);

        Comment comment = Comment.builder()
                .post(post)
                .user(user)
                .content(request.getContent())
                .build();

        Comment savedComment = commentRepository.save(comment);
        return CommentResponse.from(savedComment, List.of());
    }

    @Transactional
    public CommentResponse createReply(Long userId, Long postId, Long parentCommentId, CommentCreateRequest request) {
        User user = getUser(userId);
        Post post = getActivePost(postId);
        Comment parentComment = getActiveComment(parentCommentId);

        if (!parentComment.getPost().getId().equals(post.getId())) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "해당 게시글에 속한 댓글에만 대댓글을 작성할 수 있습니다.");
        }

        Comment reply = Comment.builder()
                .post(post)
                .user(user)
                .parentComment(parentComment)
                .content(request.getContent())
                .build();

        Comment savedReply = commentRepository.save(reply);
        return CommentResponse.from(savedReply, List.of());
    }

    public List<CommentResponse> getComments(Long postId) {
        Post post = getActivePost(postId);
        List<Comment> comments = commentRepository.findAllByPostIdAndIsDeletedFalseOrderByCreatedAtAsc(post.getId());

        Map<Long, List<Comment>> childrenByParentId = comments.stream()
                .filter(comment -> comment.getParentComment() != null)
                .collect(Collectors.groupingBy(
                        comment -> comment.getParentComment().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        return comments.stream()
                .filter(Comment::isRootComment)
                .map(comment -> toCommentResponse(comment, childrenByParentId))
                .toList();
    }

    @Transactional
    public void deleteComment(Long userId, Long commentId) {
        Comment comment = getActiveComment(commentId);
        validateCommentOwner(userId, comment);
        softDeleteRecursively(comment);
    }

    private CommentResponse toCommentResponse(Comment comment, Map<Long, List<Comment>> childrenByParentId) {
        List<CommentResponse> childResponses = childrenByParentId.getOrDefault(comment.getId(), List.of())
                .stream()
                .map(child -> toCommentResponse(child, childrenByParentId))
                .toList();

        return CommentResponse.from(comment, childResponses);
    }

    private void softDeleteRecursively(Comment comment) {
        List<Comment> childComments = commentRepository
                .findAllByParentCommentIdAndIsDeletedFalseOrderByCreatedAtAsc(comment.getId());

        for (Comment childComment : childComments) {
            softDeleteRecursively(childComment);
        }

        comment.deleteComment();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Post getActivePost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));

        if (post.isDeleted()) {
            throw new CustomException(ErrorCode.POST_NOT_FOUND);
        }

        return post;
    }

    private Comment getActiveComment(Long commentId) {
        return commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private void validateCommentOwner(Long userId, Comment comment) {
        if (!comment.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
    }
}

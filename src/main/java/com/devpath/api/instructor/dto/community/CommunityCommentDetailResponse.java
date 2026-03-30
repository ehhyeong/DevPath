package com.devpath.api.instructor.dto.community;

import com.devpath.api.instructor.entity.InstructorComment;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;

@Getter
public class CommunityCommentDetailResponse {

    private final Long id;
    private final Long postId;
    private final Long authorId;
    private final String content;
    private final Long parentCommentId;
    private final int likeCount;
    private final LocalDateTime createdAt;
    private final List<CommunityCommentDetailResponse> replies = new ArrayList<>();

    private CommunityCommentDetailResponse(
            Long id,
            Long postId,
            Long authorId,
            String content,
            Long parentCommentId,
            int likeCount,
            LocalDateTime createdAt
    ) {
        this.id = id;
        this.postId = postId;
        this.authorId = authorId;
        this.content = content;
        this.parentCommentId = parentCommentId;
        this.likeCount = likeCount;
        this.createdAt = createdAt;
    }

    public void addReply(CommunityCommentDetailResponse reply) {
        this.replies.add(reply);
    }

    public static CommunityCommentDetailResponse from(InstructorComment comment) {
        return new CommunityCommentDetailResponse(
                comment.getId(),
                comment.getPostId(),
                comment.getAuthorId(),
                comment.getContent(),
                comment.getParentCommentId(),
                comment.getLikeCount(),
                comment.getCreatedAt()
        );
    }
}

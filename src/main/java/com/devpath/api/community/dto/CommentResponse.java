package com.devpath.api.community.dto;

import com.devpath.domain.community.entity.Comment;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "댓글/대댓글 응답 DTO")
public class CommentResponse {

    @Schema(description = "댓글 ID", example = "101")
    private Long id;

    @Schema(description = "작성자 ID", example = "1")
    private Long authorId;

    @Schema(description = "작성자 이름", example = "김태형")
    private String authorName;

    @Schema(description = "부모 댓글 ID", example = "100", nullable = true)
    private Long parentCommentId;

    @Schema(description = "대댓글 여부", example = "false")
    private boolean reply;

    @Schema(description = "댓글 내용", example = "좋은 정리 감사합니다.")
    private String content;

    @Schema(description = "댓글 생성 일시", example = "2026-03-23T16:10:00")
    private LocalDateTime createdAt;

    @Schema(description = "댓글 수정 일시", example = "2026-03-23T16:10:00")
    private LocalDateTime updatedAt;

    @Schema(description = "하위 대댓글 목록")
    private List<CommentResponse> children;

    public static CommentResponse from(Comment comment, List<CommentResponse> children) {
        return CommentResponse.builder()
                .id(comment.getId())
                .authorId(comment.getUser().getId())
                .authorName(comment.getUser().getName())
                .parentCommentId(comment.getParentComment() == null ? null : comment.getParentComment().getId())
                .reply(comment.getParentComment() != null)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .children(children)
                .build();
    }
}

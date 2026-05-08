package com.devpath.api.instructor.dto.community;

import com.devpath.api.instructor.entity.InstructorComment;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommunityCommentResponse {

  private Long id;
  private Long postId;
  private Long authorId;
  private String content;
  private Long parentCommentId;
  private int likeCount;
  private LocalDateTime createdAt;

  public static CommunityCommentResponse from(InstructorComment comment) {
    return CommunityCommentResponse.builder()
        .id(comment.getId())
        .postId(comment.getPostId())
        .authorId(comment.getAuthorId())
        .content(comment.getContent())
        .parentCommentId(comment.getParentCommentId())
        .likeCount(comment.getLikeCount())
        .createdAt(comment.getCreatedAt())
        .build();
  }
}

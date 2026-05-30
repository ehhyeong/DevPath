package com.devpath.api.showcase.dto;

import com.devpath.domain.showcase.entity.ShowcaseComment;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ShowcaseCommentResponse {

  private Long commentId;
  private Long showcaseId;
  private Long userId;
  private String authorProfileImage;
  private String content;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static ShowcaseCommentResponse from(ShowcaseComment comment) {
    return from(comment, null);
  }

  public static ShowcaseCommentResponse from(ShowcaseComment comment, String authorProfileImage) {
    return ShowcaseCommentResponse.builder()
        .commentId(comment.getId())
        .showcaseId(comment.getShowcaseId())
        .userId(comment.getUserId())
        .authorProfileImage(authorProfileImage)
        .content(comment.getContent())
        .createdAt(comment.getCreatedAt())
        .updatedAt(comment.getUpdatedAt())
        .build();
  }
}

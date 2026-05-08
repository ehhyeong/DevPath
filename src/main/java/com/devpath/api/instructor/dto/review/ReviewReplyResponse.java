package com.devpath.api.instructor.dto.review;

import com.devpath.api.instructor.entity.ReviewReply;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReviewReplyResponse {

  private Long id;
  private Long reviewId;
  private Long instructorId;
  private String authorName;
  private String authorProfileImage;
  private String content;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static ReviewReplyResponse from(
      ReviewReply reply, String authorName, String authorProfileImage) {
    return ReviewReplyResponse.builder()
        .id(reply.getId())
        .reviewId(reply.getReviewId())
        .instructorId(reply.getInstructorId())
        .authorName(authorName)
        .authorProfileImage(authorProfileImage)
        .content(reply.getContent())
        .createdAt(reply.getCreatedAt())
        .updatedAt(reply.getUpdatedAt())
        .build();
  }
}

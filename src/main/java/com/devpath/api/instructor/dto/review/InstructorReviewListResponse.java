package com.devpath.api.instructor.dto.review;

import java.time.LocalDateTime;
import java.util.List;

public record InstructorReviewListResponse(
    Long reviewId,
    Long courseId,
    String courseTitle,
    Integer rating,
    String learnerName,
    LocalDateTime createdAt,
    String status,
    String content,
    List<String> issueTags,
    Boolean hidden,
    ReplyInfo reply) {

  public record ReplyInfo(
      Long replyId,
      String authorName,
      String authorProfileImage,
      String content,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {}
}

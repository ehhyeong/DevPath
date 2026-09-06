package com.devpath.domain.ai.service;

import com.devpath.domain.ai.entity.AiReviewCommentStatus;
import java.time.LocalDateTime;
import java.util.List;

public interface CodeReviewAssistant {

  Review createReview(Long requesterId, Request request);

  Review getReviewResult(Long reviewId);

  record Request(Long pullRequestId, String title, String diffText) {}

  record Review(
      Long reviewId,
      Long requesterId,
      String requesterName,
      Long pullRequestId,
      String title,
      String summary,
      Integer commentCount,
      String providerName,
      List<Comment> comments,
      LocalDateTime createdAt) {}

  record Comment(
      Long commentId,
      Long reviewId,
      String category,
      Integer lineNumber,
      String title,
      String message,
      String suggestion,
      AiReviewCommentStatus status,
      LocalDateTime decidedAt,
      LocalDateTime createdAt) {}
}

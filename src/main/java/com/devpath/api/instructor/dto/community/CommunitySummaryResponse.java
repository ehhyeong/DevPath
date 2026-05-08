package com.devpath.api.instructor.dto.community;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommunitySummaryResponse {

  private long totalPostCount;
  private long totalCommentCount;
  private long totalLikeCount;
  private long recentPostCount;
}

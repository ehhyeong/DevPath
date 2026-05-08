package com.devpath.api.builder.dto;

import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public class MyRoadmapSummary {

  private final Long myRoadmapId;
  private final String title;
  private final LocalDateTime createdAt;
  private final long moduleCount;

  // JPQL constructor expression 전용
  public MyRoadmapSummary(
      Long myRoadmapId, String title, LocalDateTime createdAt, Long moduleCount) {
    this.myRoadmapId = myRoadmapId;
    this.title = title;
    this.createdAt = createdAt;
    this.moduleCount = moduleCount;
  }
}

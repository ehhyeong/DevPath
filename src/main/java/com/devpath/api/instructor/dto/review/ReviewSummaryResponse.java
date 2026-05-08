package com.devpath.api.instructor.dto.review;

import java.util.Map;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ReviewSummaryResponse {

  private Long totalReviews;
  private Double averageRating;
  private Long unansweredCount;
  private Map<Integer, Long> ratingDistribution;
}

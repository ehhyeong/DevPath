package com.devpath.api.learning.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class SupplementRecommendationMetricsTest {

  @Test
  void assignsHighestPriorityWhenMostRequiredTagsAreMissing() {
    SupplementRecommendationMetrics metrics =
        new SupplementRecommendationMetrics(
            mock(UserTechStackRepository.class), mock(NodeRequiredTagRepository.class));

    SupplementRecommendationMetrics.Metrics result =
        metrics.calculate(Set.of("java"), List.of("java", "spring", "sql"));

    assertThat(result.priority()).isEqualTo(1);
    assertThat(result.missingTagCount()).isEqualTo(2);
    assertThat(result.coveragePercent()).isBetween(33.0, 34.0);
  }
}

package com.devpath.api.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.learning.repository.SubmissionRepository;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InstructorAssignmentAnalyticsServiceTest {

  @Mock private SubmissionRepository submissionRepository;
  @Mock private InstructorAnalyticsScope analyticsScope;
  @Spy private InstructorAnalyticsMetrics metrics = new InstructorAnalyticsMetrics();
  @InjectMocks private InstructorAssignmentAnalyticsService service;

  @Test
  void returnsEmptyAssignmentStatsWhenInstructorHasNoNodes() {
    Long instructorId = 7L;
    when(analyticsScope.loadNodeIds(instructorId)).thenReturn(Set.of());

    var result = service.getAssignmentStats(instructorId);

    assertThat(result.getSummary().getTotalSubmissions()).isZero();
    assertThat(result.getSummary().getGradedSubmissions()).isZero();
    assertThat(result.getSummary().getAverageScore()).isZero();
    assertThat(result.getSummary().getPassRate()).isZero();
    assertThat(result.getItems()).isEmpty();
  }
}

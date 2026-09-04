package com.devpath.api.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InstructorQuizAnalyticsServiceTest {

  @Mock private QuizRepository quizRepository;
  @Mock private QuizAttemptRepository quizAttemptRepository;
  @Mock private InstructorAnalyticsScope analyticsScope;
  @Spy private InstructorAnalyticsMetrics metrics = new InstructorAnalyticsMetrics();
  @InjectMocks private InstructorQuizAnalyticsService service;

  @Test
  void returnsEmptyQuizStatsWhenInstructorHasNoNodes() {
    when(analyticsScope.loadNodeIds(7L)).thenReturn(Set.of());

    var result = service.getQuizStats(7L);

    assertThat(result.getSummary().getTotalAttempts()).isZero();
    assertThat(result.getSummary().getPassedAttempts()).isZero();
    assertThat(result.getSummary().getAverageScoreRate()).isZero();
    assertThat(result.getItems()).isEmpty();
  }
}

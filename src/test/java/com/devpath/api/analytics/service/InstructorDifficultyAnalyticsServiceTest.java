package com.devpath.api.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InstructorDifficultyAnalyticsServiceTest {

  @Mock private LessonProgressRepository lessonProgressRepository;
  @Mock private SubmissionRepository submissionRepository;
  @Mock private QuizAttemptRepository quizAttemptRepository;
  @Mock private InstructorAnalyticsScope analyticsScope;
  @Spy private InstructorAnalyticsMetrics metrics = new InstructorAnalyticsMetrics();
  @InjectMocks private InstructorDifficultyAnalyticsService service;

  @Test
  void returnsEmptyDifficultyAndWeakPointsWhenInstructorHasNoMappings() {
    when(analyticsScope.loadCourseNodeMappings(7L)).thenReturn(List.of());

    assertThat(service.getDifficulty(7L)).isEmpty();
    assertThat(service.getWeakPoints(7L)).isEmpty();
  }
}

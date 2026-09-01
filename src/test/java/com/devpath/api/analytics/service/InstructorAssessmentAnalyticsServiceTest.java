package com.devpath.api.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InstructorAssessmentAnalyticsServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private CourseNodeMappingRepository courseNodeMappingRepository;
  @Mock private LessonProgressRepository lessonProgressRepository;
  @Mock private SubmissionRepository submissionRepository;
  @Mock private QuizRepository quizRepository;
  @Mock private QuizAttemptRepository quizAttemptRepository;
  @Spy private InstructorAnalyticsMetrics metrics = new InstructorAnalyticsMetrics();
  @InjectMocks private InstructorAssessmentAnalyticsService service;

  @Test
  void returnsEmptyAssignmentStatsWhenInstructorHasNoCourses() {
    Long instructorId = 7L;
    when(userRepository.findById(instructorId)).thenReturn(Optional.of(mock(User.class)));
    when(courseRepository.findAllByInstructorIdOrderByCourseIdDesc(instructorId))
        .thenReturn(List.of());

    var result = service.getAssignmentStats(instructorId);

    assertThat(result.getSummary().getTotalSubmissions()).isZero();
    assertThat(result.getSummary().getGradedSubmissions()).isZero();
    assertThat(result.getSummary().getAverageScore()).isZero();
    assertThat(result.getSummary().getPassRate()).isZero();
    assertThat(result.getItems()).isEmpty();
  }
}

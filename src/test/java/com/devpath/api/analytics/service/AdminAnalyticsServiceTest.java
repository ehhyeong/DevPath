package com.devpath.api.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.devpath.domain.analytics.repository.ExperimentResultRepository;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminAnalyticsServiceTest {

  @Mock private ExperimentResultRepository experimentResultRepository;
  @Mock private UserRepository userRepository;
  @Mock private CourseEnrollmentRepository courseEnrollmentRepository;
  @Mock private SubmissionRepository submissionRepository;
  @InjectMocks private AdminAnalyticsService adminAnalyticsService;

  @Test
  void buildsDashboardMetricsFromOperationalRepositories() {
    when(userRepository.count()).thenReturn(120L);
    when(userRepository.countByLastLoginAtAfter(any())).thenReturn(34L);
    when(courseEnrollmentRepository.findAverageProgressPercentage()).thenReturn(47.26);
    when(submissionRepository.countBySubmissionStatusAndSubmittedAtAfterAndIsDeletedFalse(
            any(SubmissionStatus.class), any()))
        .thenReturn(18L);

    var response = adminAnalyticsService.getDashboardSummary();

    assertThat(response.getTotalUsers()).isEqualTo(120L);
    assertThat(response.getWeeklyActiveUsers()).isEqualTo(34L);
    assertThat(response.getAverageRoadmapProgress()).isEqualTo(47.3);
    assertThat(response.getMonthlyCompletedAssignments()).isEqualTo(18L);
  }
}

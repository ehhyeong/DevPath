package com.devpath.api.admin.learning.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.analytics.LearningMetricSampleRepository;
import com.devpath.domain.learning.repository.automation.AutomationMonitorSnapshotRepository;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminLearningMetricServiceTest {

  @Mock private NodeClearanceRepository nodeClearanceRepository;
  @Mock private CourseEnrollmentRepository courseEnrollmentRepository;
  @Mock private LessonProgressRepository lessonProgressRepository;
  @Mock private QuizAttemptRepository quizAttemptRepository;
  @Mock private ProofCardRepository proofCardRepository;
  @Mock private RecommendationChangeRepository recommendationChangeRepository;
  @Mock private LearningMetricSampleRepository learningMetricSampleRepository;
  @Mock private AutomationMonitorSnapshotRepository automationMonitorSnapshotRepository;
  @Mock private LearningAutomationPolicyService learningAutomationPolicyService;
  @InjectMocks private AdminLearningMetricService service;

  @Test
  void repeatedAnnualReportQueriesDoNotCreateMeasurementRowsAndRespectYearBoundary() {
    ProofCard inYear =
        ProofCard.builder()
            .title("2025 카드")
            .issuedAt(LocalDateTime.of(2025, 12, 31, 23, 59, 59))
            .build();
    ProofCard nextYear =
        ProofCard.builder().title("2026 카드").issuedAt(LocalDateTime.of(2026, 1, 1, 0, 0)).build();
    when(nodeClearanceRepository.findAll()).thenReturn(List.of());
    when(courseEnrollmentRepository.findAll()).thenReturn(List.of());
    when(lessonProgressRepository.findAll()).thenReturn(List.of());
    when(quizAttemptRepository.findAll()).thenReturn(List.of());
    when(proofCardRepository.findAll()).thenReturn(List.of(inYear, nextYear));
    when(recommendationChangeRepository.findAll()).thenReturn(List.of());

    assertThat(service.getAnnualReport(2025).getIssuedProofCardCount()).isEqualTo(1L);
    assertThat(service.getAnnualReport(2025).getIssuedProofCardCount()).isEqualTo(1L);
    assertThat(service.getAnnualReport(2026).getIssuedProofCardCount()).isEqualTo(1L);
    verify(learningMetricSampleRepository, never()).save(org.mockito.ArgumentMatchers.any());
    verify(automationMonitorSnapshotRepository, never()).save(org.mockito.ArgumentMatchers.any());
  }
}

package com.devpath.domain.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.analytics.dto.ExperimentRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ExperimentLifecycleServiceTest {

  private final ExperimentResultRepository repository = mock(ExperimentResultRepository.class);
  private final AdminAnalyticsService service =
      new AdminAnalyticsService(
          repository,
          new ObjectMapper(),
          mock(UserRepository.class),
          mock(CourseEnrollmentRepository.class),
          mock(SubmissionRepository.class));

  @Test
  void createsStartsRecordsAndCompletesExperiment() {
    when(repository.save(org.mockito.ArgumentMatchers.any()))
        .thenAnswer(invocation -> invocation.getArgument(0));
    var created =
        service.createExperiment(
            new ExperimentRequest.Create("EXP-LIFECYCLE", "버튼 실험", "완료율이 증가한다"));
    ExperimentResult entity =
        ExperimentResult.builder()
            .experimentId(created.getExperimentId())
            .experimentName(created.getExperimentName())
            .hypothesis(created.getHypothesis())
            .metricsJson("{}")
            .status(ExperimentStatus.DRAFT)
            .build();
    when(repository.findByExperimentId("EXP-LIFECYCLE")).thenReturn(Optional.of(entity));

    assertThat(
            service
                .changeStatus(
                    "EXP-LIFECYCLE", new ExperimentRequest.ChangeStatus(ExperimentStatus.RUNNING))
                .getStatus())
        .isEqualTo(ExperimentStatus.RUNNING);
    service.saveResult("EXP-LIFECYCLE", new ExperimentRequest.SaveResult("{\"conversion\":0.42}"));
    assertThat(
            service
                .changeStatus(
                    "EXP-LIFECYCLE", new ExperimentRequest.ChangeStatus(ExperimentStatus.COMPLETED))
                .getStatus())
        .isEqualTo(ExperimentStatus.COMPLETED);
  }

  @Test
  void cannotCompleteWithoutObservedMetrics() {
    ExperimentResult entity =
        ExperimentResult.builder()
            .experimentId("EXP-EMPTY")
            .experimentName("빈 결과")
            .metricsJson("{}")
            .status(ExperimentStatus.RUNNING)
            .build();
    when(repository.findByExperimentId("EXP-EMPTY")).thenReturn(Optional.of(entity));

    assertThatThrownBy(
            () ->
                service.changeStatus(
                    "EXP-EMPTY", new ExperimentRequest.ChangeStatus(ExperimentStatus.COMPLETED)))
        .isInstanceOf(CustomException.class);
  }
}

package com.devpath.api.analytics.service;

import com.devpath.api.analytics.dto.AnalyticsDashboardResponse;
import com.devpath.api.analytics.dto.ExperimentRequest;
import com.devpath.api.analytics.dto.ExperimentResultResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.analytics.entity.ExperimentResult;
import com.devpath.domain.analytics.entity.ExperimentStatus;
import com.devpath.domain.analytics.repository.ExperimentResultRepository;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnalyticsService {

  private final ExperimentResultRepository experimentResultRepository;
  private final ObjectMapper objectMapper;
  private final UserRepository userRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final SubmissionRepository submissionRepository;

  public List<ExperimentResultResponse> getAllExperimentResults() {
    return experimentResultRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
        .map(ExperimentResultResponse::from)
        .collect(Collectors.toList());
  }

  public ExperimentResultResponse getExperimentResult(String experimentId) {
    ExperimentResult result =
        experimentResultRepository
            .findByExperimentId(experimentId)
            .orElseThrow(() -> new CustomException(ErrorCode.EXPERIMENT_NOT_FOUND));
    return ExperimentResultResponse.from(result);
  }

  @Transactional
  public ExperimentResultResponse createExperiment(ExperimentRequest.Create request) {
    if (experimentResultRepository.existsByExperimentId(request.experimentId())) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE, "이미 존재하는 실험 ID입니다.");
    }
    ExperimentResult experiment =
        ExperimentResult.builder()
            .experimentId(request.experimentId())
            .experimentName(request.experimentName())
            .hypothesis(request.hypothesis())
            .metricsJson("{}")
            .status(ExperimentStatus.DRAFT)
            .build();
    return ExperimentResultResponse.from(experimentResultRepository.save(experiment));
  }

  @Transactional
  public ExperimentResultResponse changeStatus(
      String experimentId, ExperimentRequest.ChangeStatus request) {
    ExperimentResult experiment = getExperiment(experimentId);
    ExperimentStatus target = request.status();
    ExperimentStatus current = experiment.getStatus();
    if (target == ExperimentStatus.RUNNING
        && (current == ExperimentStatus.DRAFT || current == ExperimentStatus.PAUSED)) {
      experiment.start();
    } else if (target == ExperimentStatus.PAUSED && current == ExperimentStatus.RUNNING) {
      experiment.pause();
    } else if (target == ExperimentStatus.COMPLETED
        && (current == ExperimentStatus.RUNNING || current == ExperimentStatus.PAUSED)) {
      if ("{}".equals(experiment.getMetricsJson().trim())) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "결과 지표를 저장한 뒤 실험을 완료할 수 있습니다.");
      }
      experiment.complete();
    } else if (target != current) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "허용되지 않는 실험 상태 전환입니다.");
    }
    return ExperimentResultResponse.from(experiment);
  }

  @Transactional
  public ExperimentResultResponse saveResult(
      String experimentId, ExperimentRequest.SaveResult request) {
    ExperimentResult experiment = getExperiment(experimentId);
    if (experiment.getStatus() != ExperimentStatus.RUNNING
        && experiment.getStatus() != ExperimentStatus.PAUSED) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "실행 중이거나 일시 중지된 실험만 결과를 저장할 수 있습니다.");
    }
    validateMetricsJson(request.metricsJson());
    experiment.saveMetrics(request.metricsJson().trim());
    return ExperimentResultResponse.from(experiment);
  }

  private ExperimentResult getExperiment(String experimentId) {
    return experimentResultRepository
        .findByExperimentId(experimentId)
        .orElseThrow(() -> new CustomException(ErrorCode.EXPERIMENT_NOT_FOUND));
  }

  private void validateMetricsJson(String metricsJson) {
    try {
      if (!objectMapper.readTree(metricsJson).isObject()) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "실험 결과는 JSON 객체여야 합니다.");
      }
    } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "실험 결과 JSON 형식이 올바르지 않습니다.");
    }
  }

  public AnalyticsDashboardResponse getDashboardSummary() {
    LocalDateTime now = LocalDateTime.now();
    Double averageProgress = courseEnrollmentRepository.findAverageProgressPercentage();

    return AnalyticsDashboardResponse.builder()
        .totalUsers(userRepository.count())
        .weeklyActiveUsers(userRepository.countByLastLoginAtAfter(now.minusDays(7)))
        .averageRoadmapProgress(roundOneDecimal(averageProgress == null ? 0.0 : averageProgress))
        .monthlyCompletedAssignments(
            submissionRepository.countBySubmissionStatusAndSubmittedAtAfterAndIsDeletedFalse(
                SubmissionStatus.GRADED, now.minusMonths(1)))
        .build();
  }

  private double roundOneDecimal(double value) {
    return Math.round(value * 10.0) / 10.0;
  }
}

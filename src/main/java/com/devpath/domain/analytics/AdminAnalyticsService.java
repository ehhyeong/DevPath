package com.devpath.domain.analytics;

import com.devpath.api.analytics.dto.AnalyticsDashboardResponse;
import com.devpath.api.analytics.dto.ExperimentResultResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
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

  public List<ExperimentResultResponse> getAllExperimentResults() {
    return experimentResultRepository.findAll().stream()
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

  public AnalyticsDashboardResponse getDashboardSummary() {
    return AnalyticsDashboardResponse.builder()
        .totalUsers(15230L)
        .weeklyActiveUsers(4321L)
        .averageRoadmapProgress(42.8)
        .monthlyCompletedAssignments(1830L)
        .build();
  }
}

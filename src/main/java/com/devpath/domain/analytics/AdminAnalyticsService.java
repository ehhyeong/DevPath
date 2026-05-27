package com.devpath.domain.analytics;

import com.devpath.api.analytics.dto.AnalyticsDashboardResponse;
import com.devpath.api.analytics.dto.ExperimentResultResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
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
    List<ExperimentResult> results = experimentResultRepository.findAll();
    List<JsonNode> metrics =
        results.stream()
            .map(this::parseMetrics)
            .flatMap(Optional::stream)
            .collect(Collectors.toList());

    return AnalyticsDashboardResponse.builder()
        .totalUsers(sumLongMetric(metrics, "totalUsers", results.size()))
        .weeklyActiveUsers(
            sumLongMetric(metrics, "weeklyActiveUsers", countCreatedAfter(results, 7)))
        .averageRoadmapProgress(averageDoubleMetric(metrics, "averageRoadmapProgress"))
        .monthlyCompletedAssignments(
            sumLongMetric(metrics, "monthlyCompletedAssignments", countCreatedAfter(results, 30)))
        .build();
  }

  private Optional<JsonNode> parseMetrics(ExperimentResult result) {
    try {
      return Optional.of(objectMapper.readTree(result.getMetricsJson()));
    } catch (JsonProcessingException exception) {
      return Optional.empty();
    }
  }

  private long sumLongMetric(List<JsonNode> metrics, String fieldName, long fallback) {
    long sum = 0L;

    for (JsonNode metric : metrics) {
      JsonNode field = metric.get(fieldName);
      if (field != null && field.isNumber()) {
        sum += field.asLong();
      }
    }

    return sum > 0 ? sum : fallback;
  }

  private double averageDoubleMetric(List<JsonNode> metrics, String fieldName) {
    double sum = 0.0;
    int count = 0;

    for (JsonNode metric : metrics) {
      JsonNode field = metric.get(fieldName);
      if (field != null && field.isNumber()) {
        sum += field.asDouble();
        count++;
      }
    }

    if (count == 0) {
      return 0.0;
    }

    return Math.round((sum / count) * 10.0) / 10.0;
  }

  private long countCreatedAfter(List<ExperimentResult> results, long days) {
    LocalDateTime threshold = LocalDateTime.now().minusDays(days);

    return results.stream()
        .filter(result -> result.getCreatedAt() != null)
        .filter(result -> result.getCreatedAt().isAfter(threshold))
        .count();
  }
}

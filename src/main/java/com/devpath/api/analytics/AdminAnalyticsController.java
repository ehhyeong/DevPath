package com.devpath.api.analytics;

import com.devpath.api.analytics.dto.AnalyticsDashboardResponse;
import com.devpath.api.analytics.dto.ExperimentResultResponse;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.analytics.AdminAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin Analytics", description = "관리자 A/B 테스트 및 데이터 분석 API")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminAnalyticsController {

  private final AdminAnalyticsService analyticsService;

  @Operation(summary = "A/B 테스트 결과 목록 조회", description = "진행되었거나 진행 중인 모든 A/B 테스트 결과를 조회합니다.")
  @GetMapping("/experiments/results")
  public ResponseEntity<ApiResponse<List<ExperimentResultResponse>>> getAllExperimentResults() {
    List<ExperimentResultResponse> responses = analyticsService.getAllExperimentResults();
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @Operation(summary = "특정 A/B 테스트 결과 상세 조회", description = "실험 ID를 기반으로 단건 A/B 테스트 결과를 조회합니다.")
  @GetMapping("/experiments/{experimentId}/results")
  public ResponseEntity<ApiResponse<ExperimentResultResponse>> getExperimentResult(
      @Parameter(description = "실험 고유 ID") @PathVariable String experimentId) {
    ExperimentResultResponse response = analyticsService.getExperimentResult(experimentId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @Operation(summary = "데이터 분석 대시보드 기초 조회", description = "관리자 메인 대시보드용 주요 지표 요약 데이터를 조회합니다.")
  @GetMapping("/analytics/dashboard")
  public ResponseEntity<ApiResponse<AnalyticsDashboardResponse>> getAnalyticsDashboard() {
    AnalyticsDashboardResponse response = analyticsService.getDashboardSummary();
    return ResponseEntity.ok(ApiResponse.success(response));
  }
}

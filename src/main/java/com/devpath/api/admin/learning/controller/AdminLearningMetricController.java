package com.devpath.api.admin.learning.controller;

import com.devpath.api.admin.learning.dto.AdminLearningMetricResponse;
import com.devpath.api.admin.learning.service.AdminLearningMetricService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 관리자 학습 지표 API 컨트롤러다.
@Tag(name = "관리자 - 학습 지표", description = "관리자 학습 지표 조회 API")
@RestController
@RequestMapping("/api/admin/learning-metrics")
@RequiredArgsConstructor
public class AdminLearningMetricController {

  private final AdminLearningMetricService adminLearningMetricService;

  @Operation(summary = "학습 지표 목록 조회", description = "핵심 학습 지표 목록을 조회합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<List<AdminLearningMetricResponse.Detail>>> getMetrics() {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getMetrics()));
  }

  @Operation(summary = "노드 클리어율 조회", description = "노드 클리어율 지표를 조회합니다.")
  @GetMapping("/clearance-rate")
  public ResponseEntity<ApiResponse<AdminLearningMetricResponse.Detail>> getClearanceRate() {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getClearanceRate()));
  }

  @Operation(summary = "로드맵 완료율 조회", description = "로드맵 완료율 지표를 조회합니다.")
  @GetMapping("/roadmap-completion-rate")
  public ResponseEntity<ApiResponse<AdminLearningMetricResponse.Detail>>
      getRoadmapCompletionRate() {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getRoadmapCompletionRate()));
  }

  @Operation(summary = "평균 학습 시간 조회", description = "평균 학습 시간 지표를 조회합니다.")
  @GetMapping("/learning-duration")
  public ResponseEntity<ApiResponse<AdminLearningMetricResponse.Detail>> getLearningDuration() {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getLearningDuration()));
  }

  @Operation(summary = "퀴즈 품질 점수 조회", description = "퀴즈 품질 점수를 조회합니다.")
  @GetMapping("/quiz-quality")
  public ResponseEntity<ApiResponse<AdminLearningMetricResponse.Detail>> getQuizQuality() {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getQuizQuality()));
  }

  @Operation(summary = "학습 자동화 모니터 조회", description = "자동화 규칙 상태 기반 모니터링 데이터를 조회합니다.")
  @GetMapping("/automation-monitor")
  public ResponseEntity<ApiResponse<List<AdminLearningMetricResponse.AutomationMonitorDetail>>>
      getAutomationMonitor() {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getAutomationMonitor()));
  }

  @Operation(summary = "연간 학습 리포트 조회", description = "연간 학습 리포트를 조회합니다.")
  @GetMapping("/annual-report")
  public ResponseEntity<ApiResponse<AdminLearningMetricResponse.AnnualReportDetail>>
      getAnnualReport() {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getAnnualReport()));
  }
}

package com.devpath.api.learner.controller;

import com.devpath.api.learner.service.DiagnosisRecommendationAsyncRunner;
import com.devpath.api.recommendation.dto.RecommendationStatusResponse;
import com.devpath.api.recommendation.service.RecommendationStatusService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/roadmaps")
@RequiredArgsConstructor
@Profile({"local", "test"})
@Tag(name = "진단 퀴즈 테스트", description = "local/test 프로필 전용 진단 퀴즈 테스트 API")
public class DiagnosisQuizTestController {

  private final DiagnosisRecommendationAsyncRunner diagnosisRecommendationAsyncRunner;
  private final RecommendationStatusService recommendationStatusService;

  @PostMapping("/{roadmapId}/diagnosis/test-run")
  @Operation(
      summary = "[TEST] 즉시 분기 추천 생성(비동기)",
      description = "local/test 프로필 전용 테스트 API입니다")
  public ResponseEntity<ApiResponse<Void>> testRunDiagnosis(
      @PathVariable Long roadmapId,
      @RequestParam Long originalNodeId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {

    diagnosisRecommendationAsyncRunner.runAsync(userId, roadmapId, originalNodeId);
    return ResponseEntity.accepted().body(ApiResponse.ok());
  }

  @GetMapping("/{roadmapId}/diagnosis/recommend-status")
  @Operation(
      summary = "[TEST] 비동기 추천 생성 진행 상태 조회",
      description = "노드 클리어 후 백그라운드 추천 생성의 진행 상태를 조회합니다(local/test 전용)")
  public ResponseEntity<ApiResponse<RecommendationStatusResponse>> recommendStatus(
      @PathVariable Long roadmapId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {

    RecommendationStatusResponse body =
        recommendationStatusService
            .get(userId)
            .map(
                status ->
                    RecommendationStatusResponse.builder()
                        .status(status.getStatus())
                        .nodeId(status.getNodeId())
                        .count(status.getCount())
                        .build())
            .orElse(
                RecommendationStatusResponse.builder()
                    .status(RecommendationStatusService.IDLE)
                    .count(0)
                    .build());
    return ResponseEntity.ok(ApiResponse.ok(body));
  }
}

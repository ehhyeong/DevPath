package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.RecommendationHistoryResponse;
import com.devpath.api.learning.dto.RiskWarningResponse;
import com.devpath.api.learning.dto.SupplementRecommendationResponse;
import com.devpath.api.learning.service.SupplementRecommendationService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "학습자 - 보강 추천", description = "보강 추천 후보 생성 및 상태 관리 API")
@RestController
@RequestMapping("/api/learning/supplement-recommendations")
@RequiredArgsConstructor
public class SupplementRecommendationController {

  private final SupplementRecommendationService supplementRecommendationService;

  @Operation(summary = "보강 추천 생성", description = "보강 추천 후보를 수동 또는 자동으로 생성합니다.")
  @PostMapping
  public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> createRecommendation(
      @AuthenticationPrincipal Long userId,
      @RequestParam(required = false) Long nodeId,
      @RequestParam(required = false) String reason) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.ok(
                supplementRecommendationService.createRecommendation(userId, nodeId, reason)));
  }

  @Operation(summary = "보강 추천 목록 조회", description = "상태 필터를 적용해 보강 추천 목록을 조회합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<List<SupplementRecommendationResponse>>> getRecommendations(
      @AuthenticationPrincipal Long userId,
      @RequestParam(required = false) RecommendationStatus status) {
    return ResponseEntity.ok(
        ApiResponse.ok(supplementRecommendationService.getRecommendations(userId, status)));
  }

  @Operation(summary = "보강 추천 승인", description = "보강 추천을 승인합니다.")
  @PatchMapping("/{recommendationId}/approve")
  public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> approveRecommendation(
      @AuthenticationPrincipal Long userId, @PathVariable Long recommendationId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            supplementRecommendationService.approveRecommendation(userId, recommendationId)));
  }

  @Operation(summary = "보강 추천 거절", description = "보강 추천을 거절합니다.")
  @PatchMapping("/{recommendationId}/reject")
  public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> rejectRecommendation(
      @AuthenticationPrincipal Long userId, @PathVariable Long recommendationId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            supplementRecommendationService.rejectRecommendation(userId, recommendationId)));
  }

  @Operation(summary = "추천 이력 조회", description = "추천 ID 또는 노드 ID 기준으로 추천 이력을 조회합니다.")
  @GetMapping("/histories")
  public ResponseEntity<ApiResponse<List<RecommendationHistoryResponse>>>
      getRecommendationHistories(
          @AuthenticationPrincipal Long userId,
          @RequestParam(required = false) Long recommendationId,
          @RequestParam(required = false) Long nodeId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            supplementRecommendationService.getRecommendationHistories(
                userId, recommendationId, nodeId)));
  }

  @Operation(summary = "리스크 경고 조회", description = "미확인 여부와 노드 조건으로 리스크 경고 목록을 조회합니다.")
  @GetMapping("/risk-warnings")
  public ResponseEntity<ApiResponse<List<RiskWarningResponse>>> getRiskWarnings(
      @AuthenticationPrincipal Long userId,
      @RequestParam(required = false) Boolean unacknowledgedOnly,
      @RequestParam(required = false) Long nodeId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            supplementRecommendationService.getRiskWarnings(userId, unacknowledgedOnly, nodeId)));
  }
}

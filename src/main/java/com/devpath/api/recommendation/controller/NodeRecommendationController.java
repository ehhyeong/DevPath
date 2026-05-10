package com.devpath.api.recommendation.controller;

import com.devpath.api.recommendation.dto.NodeRecommendationDto;
import com.devpath.api.recommendation.service.NodeRecommendationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
@Tag(name = "학습자 - 노드 추천", description = "기존 로드맵 노드 추천 관리 API")
public class NodeRecommendationController {

  private final NodeRecommendationService nodeRecommendationService;

  @PostMapping("/roadmaps/{roadmapId}/recommendations/init")
  @Operation(summary = "기존 추천 후보 생성", description = "로드맵 기준 기존 추천 후보를 생성합니다.")
  public ResponseEntity<ApiResponse<NodeRecommendationDto.GenerateRecommendationsResponse>>
      generateRecommendations(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            nodeRecommendationService.generateRecommendationResponse(userId, roadmapId)));
  }

  @GetMapping("/roadmaps/{roadmapId}/recommendations")
  @Operation(summary = "기존 추천 목록 조회", description = "로드맵 기준 기존 추천 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<NodeRecommendationDto.RoadmapRecommendationsResponse>>
      getRecommendations(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId,
          @Parameter(description = "대기 상태만 조회할지 여부") @RequestParam(defaultValue = "true")
              Boolean pendingOnly) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            nodeRecommendationService.getRoadmapRecommendations(userId, roadmapId, pendingOnly)));
  }

  @PatchMapping("/recommendations/{recommendationId}/accept")
  @Operation(summary = "기존 추천 수락", description = "기존 추천 노드를 수락합니다.")
  public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>>
      acceptRecommendation(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "추천 ID") @PathVariable Long recommendationId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            nodeRecommendationService.acceptRecommendationResponse(userId, recommendationId)));
  }

  @PatchMapping("/recommendations/{recommendationId}/reject")
  @Operation(summary = "기존 추천 거절", description = "기존 추천 노드를 거절합니다.")
  public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>>
      rejectRecommendation(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "추천 ID") @PathVariable Long recommendationId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            nodeRecommendationService.rejectRecommendationResponse(userId, recommendationId)));
  }

  @PatchMapping("/recommendations/{recommendationId}/expire")
  @Operation(summary = "기존 추천 만료 처리", description = "기존 추천 노드를 수동으로 만료 처리합니다.")
  public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>>
      expireRecommendation(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "추천 ID") @PathVariable Long recommendationId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            nodeRecommendationService.expireRecommendationResponse(userId, recommendationId)));
  }
}

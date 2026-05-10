package com.devpath.api.recommendation.controller;

import com.devpath.api.recommendation.dto.NodeRecommendationDto;
import com.devpath.api.recommendation.service.NodeRecommendationService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
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
  @Operation(
      summary = "기존 추천 후보 생성",
      description = "로드맵 기준 기존 추천 후보를 생성합니다. Recommendation Change API와 별도 축으로 유지합니다.")
  public ResponseEntity<ApiResponse<NodeRecommendationDto.GenerateRecommendationsResponse>>
      generateRecommendations(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId) {
    List<NodeRecommendation> recommendations =
        nodeRecommendationService.generateRecommendations(userId, roadmapId);
    NodeRecommendationDto.GenerateRecommendationsResponse response =
        NodeRecommendationDto.GenerateRecommendationsResponse.from(roadmapId, recommendations);

    return ResponseEntity.ok(ApiResponse.ok(response));
  }

  @GetMapping("/roadmaps/{roadmapId}/recommendations")
  @Operation(
      summary = "기존 추천 목록 조회",
      description = "로드맵 기준 기존 추천 목록을 조회합니다. Recommendation Change 목록과 역할을 분리합니다.")
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
    NodeRecommendation recommendation =
        nodeRecommendationService.acceptRecommendation(userId, recommendationId);

    return ResponseEntity.ok(
        ApiResponse.ok(
            NodeRecommendationDto.ProcessRecommendationResponse.from(
                recommendation, "추천 노드를 내 로드맵에 추가했습니다.")));
  }

  @PatchMapping("/recommendations/{recommendationId}/reject")
  @Operation(summary = "기존 추천 거절", description = "기존 추천 노드를 거절합니다.")
  public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>>
      rejectRecommendation(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "추천 ID") @PathVariable Long recommendationId) {
    NodeRecommendation recommendation =
        nodeRecommendationService.rejectRecommendation(userId, recommendationId);

    return ResponseEntity.ok(
        ApiResponse.ok(
            NodeRecommendationDto.ProcessRecommendationResponse.from(
                recommendation, "추천을 거절했습니다.")));
  }

  @PatchMapping("/recommendations/{recommendationId}/expire")
  @Operation(summary = "기존 추천 만료 처리", description = "기존 추천 노드를 수동으로 만료 처리합니다.")
  public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>>
      expireRecommendation(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "추천 ID") @PathVariable Long recommendationId) {
    NodeRecommendation recommendation =
        nodeRecommendationService.expireRecommendation(userId, recommendationId);

    return ResponseEntity.ok(
        ApiResponse.ok(
            NodeRecommendationDto.ProcessRecommendationResponse.from(
                recommendation, "추천을 만료 처리했습니다.")));
  }
}

package com.devpath.api.recommendation.controller;

import com.devpath.api.recommendation.dto.RecommendationChangeRequest;
import com.devpath.api.recommendation.dto.RecommendationChangeResponse;
import com.devpath.api.recommendation.service.RecommendationChangeService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "학습자 - 추천 변경", description = "학습자 추천 변경 제안 API")
@RestController
@RequestMapping("/api/me/recommendation-changes")
@RequiredArgsConstructor
public class RecommendationChangeController {

  private final RecommendationChangeService recommendationChangeService;

  @Operation(summary = "추천 변경 제안 생성", description = "보강 추천과 학습 신호를 기반으로 추천 변경 제안을 생성합니다.")
  @PostMapping("/suggestions")
  public ResponseEntity<ApiResponse<List<RecommendationChangeResponse.Detail>>> createSuggestions(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody RecommendationChangeRequest.Suggestion request) {
    return ResponseEntity.ok(
        ApiResponse.ok(recommendationChangeService.createSuggestions(userId, request)));
  }

  @Operation(summary = "추천 변경 제안 조회", description = "현재 추천 변경 제안 목록을 조회합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<List<RecommendationChangeResponse.Detail>>>
      getRecommendationChanges(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @RequestParam(required = false) Long roadmapId,
          @RequestParam(required = false) Long customRoadmapId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            recommendationChangeService.getRecommendationChanges(
                userId, roadmapId, customRoadmapId)));
  }

  @Operation(summary = "추천 변경 적용", description = "추천 변경 제안을 적용합니다.")
  @PostMapping("/{changeId}/apply")
  public ResponseEntity<ApiResponse<RecommendationChangeResponse.Detail>> apply(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "추천 변경 ID", example = "1") @PathVariable Long changeId) {
    return ResponseEntity.ok(ApiResponse.ok(recommendationChangeService.apply(userId, changeId)));
  }

  @Operation(summary = "추천 변경 무시", description = "추천 변경 제안을 무시합니다.")
  @PostMapping("/{changeId}/ignore")
  public ResponseEntity<ApiResponse<RecommendationChangeResponse.Detail>> ignore(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "추천 변경 ID", example = "1") @PathVariable Long changeId) {
    return ResponseEntity.ok(ApiResponse.ok(recommendationChangeService.ignore(userId, changeId)));
  }

  @Operation(summary = "추천 변경 이력 조회", description = "적용, 무시, 재계산 처리된 추천 변경 이력을 조회합니다.")
  @GetMapping("/histories")
  public ResponseEntity<ApiResponse<List<RecommendationChangeResponse.HistoryItem>>> getHistories(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @RequestParam(required = false) Long roadmapId,
      @RequestParam(required = false) Long customRoadmapId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            recommendationChangeService.getHistories(userId, roadmapId, customRoadmapId)));
  }

  @Operation(summary = "다음 추천 변경 재계산", description = "현재 제안을 재계산 처리하고 추천 변경 제안을 다시 생성합니다.")
  @PostMapping("/recalculate-next-nodes")
  public ResponseEntity<ApiResponse<RecommendationChangeResponse.RecalculateResult>>
      recalculateNextNodes(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Valid @RequestBody RecommendationChangeRequest.RecalculateNextNodes request) {
    return ResponseEntity.ok(
        ApiResponse.ok(recommendationChangeService.recalculateNextNodes(userId, request)));
  }
}

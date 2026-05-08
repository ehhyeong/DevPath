package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.LearningHistoryRequest;
import com.devpath.api.learning.dto.LearningHistoryResponse;
import com.devpath.api.learning.dto.TilResponse;
import com.devpath.api.learning.service.LearningHistoryService;
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
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "학습자 - 학습 이력", description = "학습자 학습 이력 API")
@RestController
@RequestMapping("/api/me/learning-histories")
@RequiredArgsConstructor
public class LearningHistoryController {

  private final LearningHistoryService learningHistoryService;

  @Operation(summary = "학습 이력 조회", description = "전체 학습 이력 조회 모델을 반환합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<LearningHistoryResponse.Detail>> getLearningHistory(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(learningHistoryService.getLearningHistory(userId)));
  }

  @Operation(summary = "학습 이력 요약 조회", description = "학습 이력 요약 정보를 조회합니다.")
  @GetMapping("/summary")
  public ResponseEntity<ApiResponse<LearningHistoryResponse.Summary>> getSummary(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(learningHistoryService.getSummary(userId)));
  }

  @Operation(summary = "완료 노드 조회", description = "클리어한 로드맵 노드 목록을 조회합니다.")
  @GetMapping("/completed-nodes")
  public ResponseEntity<ApiResponse<List<LearningHistoryResponse.CompletedNodeDetail>>>
      getCompletedNodes(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(learningHistoryService.getCompletedNodes(userId)));
  }

  @Operation(summary = "과제 이력 조회", description = "과제 제출 및 채점 결과를 조회합니다.")
  @GetMapping("/assignments")
  public ResponseEntity<ApiResponse<List<LearningHistoryResponse.AssignmentDetail>>> getAssignments(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(learningHistoryService.getAssignments(userId)));
  }

  @Operation(summary = "TIL 이력 조회", description = "학습 이력에 포함되는 TIL 목록을 조회합니다.")
  @GetMapping("/til")
  public ResponseEntity<ApiResponse<List<TilResponse>>> getTilHistory(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(learningHistoryService.getTilHistory(userId)));
  }

  @Operation(summary = "학습 이력 공유 링크 생성", description = "학습 이력 공유 링크를 생성합니다.")
  @PostMapping("/share-links")
  public ResponseEntity<ApiResponse<LearningHistoryResponse.ShareLinkDetail>> createShareLink(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody LearningHistoryRequest.CreateShareLink request) {
    return ResponseEntity.ok(
        ApiResponse.ok(learningHistoryService.createShareLink(userId, request)));
  }

  @Operation(summary = "공유 학습 이력 조회", description = "공유 토큰으로 학습 이력을 조회합니다.")
  @GetMapping("/share-links/{shareToken}")
  public ResponseEntity<ApiResponse<LearningHistoryResponse.SharedDetail>> getSharedLearningHistory(
      @Parameter(description = "공유 토큰", example = "history-share-token-123") @PathVariable
          String shareToken) {
    return ResponseEntity.ok(
        ApiResponse.ok(learningHistoryService.getSharedLearningHistory(shareToken)));
  }

  @Operation(summary = "학습 이력 정리", description = "학습 이력 요약을 다시 구성합니다.")
  @PostMapping("/organize")
  public ResponseEntity<ApiResponse<LearningHistoryResponse.OrganizeResult>> organize(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody LearningHistoryRequest.Organize request) {
    return ResponseEntity.ok(ApiResponse.ok(learningHistoryService.organize(userId, request)));
  }
}

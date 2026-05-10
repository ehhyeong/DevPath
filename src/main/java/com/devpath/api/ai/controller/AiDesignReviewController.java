package com.devpath.api.ai.controller;

import com.devpath.api.ai.dto.AiDesignReviewRequest;
import com.devpath.api.ai.dto.AiDesignReviewResponse;
import com.devpath.api.ai.service.AiDesignReviewService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
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
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.AI_DESIGN_REVIEW, description = "ERD/API 명세 기반 AI 설계 리뷰 API")
@RestController
@RequiredArgsConstructor
public class AiDesignReviewController {

  private final AiDesignReviewService aiDesignReviewService;

  @PostMapping("/api/ai/design-reviews")
  @Operation(summary = "AI 설계 리뷰 요청", description = "ERD 텍스트와 API 명세 텍스트를 저장하고 설계 리뷰 요약을 생성합니다.")
  public ResponseEntity<ApiResponse<AiDesignReviewResponse.Detail>> createReview(
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId,
      @Valid @RequestBody AiDesignReviewRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(
        ApiResponse.ok(aiDesignReviewService.createReview(requesterId, request)));
  }

  @GetMapping("/api/ai/design-reviews/{reviewId}")
  @Operation(summary = "AI 설계 리뷰 결과 조회", description = "AI 설계 리뷰 상세와 개선 제안 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<AiDesignReviewResponse.Detail>> getReview(
      @PathVariable Long reviewId) {
    // 설계 리뷰 상세와 개선 제안 목록을 함께 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(aiDesignReviewService.getReview(reviewId)));
  }

  @PostMapping("/api/ai/design-reviews/{reviewId}/suggestions")
  @Operation(summary = "설계 개선 제안 저장", description = "AI 설계 리뷰에 대한 개선 제안을 저장합니다.")
  public ResponseEntity<ApiResponse<AiDesignReviewResponse.SuggestionDetail>> createSuggestion(
      @PathVariable Long reviewId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long createdByUserId,
      @Valid @RequestBody AiDesignReviewRequest.SuggestionCreate request) {
    // 개선 제안 저장 권한은 현재 사용자 존재 여부 기준으로 검증한다.
    return ResponseEntity.ok(
        ApiResponse.ok(aiDesignReviewService.createSuggestion(reviewId, createdByUserId, request)));
  }

  @GetMapping("/api/ai/design-reviews/{reviewId}/suggestions")
  @Operation(summary = "설계 개선 제안 목록 조회", description = "AI 설계 리뷰에 저장된 개선 제안 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<AiDesignReviewResponse.SuggestionDetail>>> getSuggestions(
      @PathVariable Long reviewId) {
    // 삭제되지 않은 개선 제안 목록을 생성순으로 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(aiDesignReviewService.getSuggestions(reviewId)));
  }
}

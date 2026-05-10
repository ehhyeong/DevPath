package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.CreateFeedbackRequest;
import com.devpath.api.evaluation.dto.response.FeedbackResponse;
import com.devpath.api.evaluation.service.FeedbackService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - 제출물 피드백", description = "강사용 제출물 피드백 작성 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/instructor/submissions")
public class InstructorFeedbackController {

  // Evaluation Swagger 문서화 기준에 맞춘 강사용 피드백 컨트롤러다.
  private final FeedbackService feedbackService;

  @Operation(
      summary = "피드백 작성",
      description =
          "채점 완료된 제출물에 대해 개별 피드백 또는 공통 피드백을 작성합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/{submissionId}/feedback")
  public ResponseEntity<ApiResponse<FeedbackResponse>> createFeedback(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "제출 ID", example = "1") @PathVariable Long submissionId,
      @Valid @RequestBody CreateFeedbackRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "피드백이 저장되었습니다.", feedbackService.createFeedback(userId, submissionId, request)));
  }
}

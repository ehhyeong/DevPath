package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.SubmitQuizAttemptRequest;
import com.devpath.api.evaluation.dto.response.QuizAttemptResultResponse;
import com.devpath.api.evaluation.service.QuizAttemptService;
import com.devpath.api.evaluation.service.QuizResultQueryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - 퀴즈 응시", description = "학습자용 퀴즈 응시 및 결과 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/learner/quizzes")
public class LearnerQuizController {

  // Evaluation Swagger 문서화 기준에 맞춘 학습자 퀴즈 컨트롤러다.
  private final QuizAttemptService quizAttemptService;
  private final QuizResultQueryService quizResultQueryService;

  @Operation(
      summary = "퀴즈 응시",
      description =
          "학습자가 퀴즈 답안을 제출하고 즉시 채점 결과를 확인합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/{quizId}/attempts")
  public ResponseEntity<ApiResponse<QuizAttemptResultResponse>> submitQuizAttempt(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "퀴즈 ID", example = "10") @PathVariable Long quizId,
      @Valid @RequestBody SubmitQuizAttemptRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "퀴즈 응시가 완료되었습니다.", quizAttemptService.submitQuizAttempt(userId, quizId, request)));
  }

  @Operation(
      summary = "퀴즈 결과 조회",
      description =
          "학습자가 자신의 퀴즈 응시 결과를 조회합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @GetMapping("/attempts/{attemptId}/result")
  public ResponseEntity<ApiResponse<QuizAttemptResultResponse>> getQuizAttemptResult(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "응시 ID", example = "100") @PathVariable Long attemptId) {
    return ResponseEntity.ok(
        ApiResponse.ok(quizResultQueryService.getQuizAttemptResult(userId, attemptId)));
  }
}

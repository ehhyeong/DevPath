package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.DiagnosisQuizDto;
import com.devpath.api.learner.service.DiagnosisQuizService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/roadmaps")
@RequiredArgsConstructor
@Tag(name = "진단 퀴즈", description = "진단 퀴즈 API")
public class DiagnosisQuizController {

  private final DiagnosisQuizService diagnosisQuizService;

  /** 진단 퀴즈 시작 */
  @PostMapping("/{roadmapId}/diagnosis")
  @Operation(summary = "진단 퀴즈 시작", description = "로드맵 진입 시 진단 퀴즈를 생성합니다")
  public ResponseEntity<ApiResponse<DiagnosisQuizDto.QuizResponse>> createDiagnosisQuiz(
      @PathVariable Long roadmapId,
      @RequestBody DiagnosisQuizDto.CreateQuizRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {

    DiagnosisQuizDto.QuizResponse response =
        diagnosisQuizService.createDiagnosisQuiz(userId, roadmapId, request.getDifficulty());

    return ResponseEntity.ok(ApiResponse.ok(response));
  }

  /** 진단 퀴즈 제출 */
  @PostMapping("/diagnosis/{quizId}/submit")
  @Operation(summary = "진단 퀴즈 제출", description = "진단 퀴즈 답안을 제출하고 결과를 받습니다")
  public ResponseEntity<ApiResponse<DiagnosisQuizDto.QuizResultResponse>> submitQuizAnswer(
      @PathVariable Long quizId,
      @RequestBody DiagnosisQuizDto.SubmitAnswerRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {

    DiagnosisQuizDto.QuizResultResponse response =
        diagnosisQuizService.submitQuizAnswer(
            userId, quizId, request.getClearedNodeId(), request.getAnswers());

    return ResponseEntity.ok(ApiResponse.ok(response));
  }

  /** 진단 결과 조회 */
  @GetMapping("/diagnosis/{resultId}/result")
  @Operation(summary = "진단 결과 조회", description = "진단 퀴즈 결과를 조회합니다")
  public ResponseEntity<ApiResponse<DiagnosisQuizDto.QuizResultResponse>> getDiagnosisResult(
      @PathVariable Long resultId, @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {

    DiagnosisQuizDto.QuizResultResponse response =
        diagnosisQuizService.getDiagnosisResult(userId, resultId);

    return ResponseEntity.ok(ApiResponse.ok(response));
  }

  /** 최근 진단 결과 조회 */
  @GetMapping("/{roadmapId}/diagnosis/latest")
  @Operation(summary = "최근 진단 결과 조회", description = "특정 로드맵의 가장 최근 진단 결과를 조회합니다")
  public ResponseEntity<ApiResponse<DiagnosisQuizDto.QuizResultResponse>> getLatestDiagnosisResult(
      @PathVariable Long roadmapId, @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {

    DiagnosisQuizDto.QuizResultResponse response =
        diagnosisQuizService.getLatestDiagnosisResult(userId, roadmapId);

    return ResponseEntity.ok(ApiResponse.ok(response));
  }
}

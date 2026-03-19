package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.CreateQuizQuestionRequest;
import com.devpath.api.evaluation.dto.request.CreateQuizRequest;
import com.devpath.api.evaluation.dto.request.UpdateQuizAnswerExplanationRequest;
import com.devpath.api.evaluation.dto.response.QuizDetailResponse;
import com.devpath.api.evaluation.service.QuizCommandService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Instructor Evaluation - Quiz", description = "강사용 퀴즈 출제 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor/quizzes")
public class InstructorQuizController {

  // 퀴즈 출제 관련 비즈니스 로직을 담당하는 서비스다.
  private final QuizCommandService quizCommandService;

  // 강사가 퀴즈 루트 정보를 생성한다.
  @Operation(summary = "강사 퀴즈 생성", description = "강사가 퀴즈 기본 정보를 생성합니다. JWT 적용 전에는 Swagger 테스트를 위해 userId를 RequestParam으로 받습니다.")
  @PostMapping
  public ResponseEntity<ApiResponse<QuizDetailResponse>> createQuiz(
      @Parameter(description = "강사 유저 ID", example = "1") @RequestParam Long userId,
      @Valid @RequestBody CreateQuizRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("퀴즈가 생성되었습니다.", quizCommandService.createQuiz(userId, request)));
  }

  // 강사가 특정 퀴즈에 문항과 선택지를 추가한다.
  @Operation(summary = "강사 퀴즈 문항/선택지 생성", description = "강사가 특정 퀴즈에 문항과 선택지를 추가합니다.")
  @PostMapping("/{quizId}/questions")
  public ResponseEntity<ApiResponse<QuizDetailResponse>> addQuestion(
      @Parameter(description = "강사 유저 ID", example = "1") @RequestParam Long userId,
      @Parameter(description = "퀴즈 ID", example = "10") @PathVariable Long quizId,
      @Valid @RequestBody CreateQuizQuestionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("퀴즈 문항이 생성되었습니다.", quizCommandService.addQuestion(userId, quizId, request)));
  }

  // 강사가 특정 문항의 정답과 해설을 저장한다.
  @Operation(summary = "강사 퀴즈 정답/해설 저장", description = "강사가 특정 문항의 정답 선택지와 해설을 저장합니다.")
  @PatchMapping("/{quizId}/questions/{questionId}/answer-explanation")
  public ResponseEntity<ApiResponse<QuizDetailResponse>> updateAnswerAndExplanation(
      @Parameter(description = "강사 유저 ID", example = "1") @RequestParam Long userId,
      @Parameter(description = "퀴즈 ID", example = "10") @PathVariable Long quizId,
      @Parameter(description = "문항 ID", example = "101") @PathVariable Long questionId,
      @Valid @RequestBody UpdateQuizAnswerExplanationRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "퀴즈 정답과 해설이 저장되었습니다.",
            quizCommandService.updateAnswerAndExplanation(userId, quizId, questionId, request)));
  }
}

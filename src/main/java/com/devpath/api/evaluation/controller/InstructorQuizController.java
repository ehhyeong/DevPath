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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - 퀴즈 출제", description = "강사용 퀴즈 생성, 문항 추가, 정답/해설 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor/quizzes")
public class InstructorQuizController {

  // Evaluation Swagger 문서화 기준에 맞춘 강사용 퀴즈 컨트롤러다.
  private final QuizCommandService quizCommandService;

  @Operation(
      summary = "퀴즈 생성",
      description =
          "강사가 로드맵 노드에 연결할 퀴즈 기본 정보를 생성합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping
  public ResponseEntity<ApiResponse<QuizDetailResponse>> createQuiz(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody CreateQuizRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("퀴즈가 생성되었습니다.", quizCommandService.createQuiz(userId, request)));
  }

  @Operation(
      summary = "퀴즈 문항 생성",
      description =
          "강사가 특정 퀴즈에 문항과 선택지를 추가합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/{quizId}/questions")
  public ResponseEntity<ApiResponse<QuizDetailResponse>> addQuestion(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "퀴즈 ID", example = "10") @PathVariable Long quizId,
      @Valid @RequestBody CreateQuizQuestionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "퀴즈 문항이 생성되었습니다.", quizCommandService.addQuestion(userId, quizId, request)));
  }

  @Operation(
      summary = "퀴즈 정답/해설 수정",
      description =
          "강사가 특정 문항의 정답 선택지와 해설을 수정합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PatchMapping("/{quizId}/questions/{questionId}/answer-explanation")
  public ResponseEntity<ApiResponse<QuizDetailResponse>> updateAnswerAndExplanation(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "퀴즈 ID", example = "10") @PathVariable Long quizId,
      @Parameter(description = "문항 ID", example = "101") @PathVariable Long questionId,
      @Valid @RequestBody UpdateQuizAnswerExplanationRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "퀴즈 정답과 해설이 수정되었습니다.",
            quizCommandService.updateAnswerAndExplanation(userId, quizId, questionId, request)));
  }
}

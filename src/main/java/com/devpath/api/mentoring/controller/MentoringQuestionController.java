package com.devpath.api.mentoring.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.mentoring.service.MentoringQuestionService;
import com.devpath.api.qna.dto.AnswerCreateRequest;
import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionStatusUpdateRequest;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerDocConstants;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.MENTORING_QNA, description = "멘토링 전용 Q&A API")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MentoringQuestionController {

  private final MentoringQuestionService mentoringQuestionService;

  @PostMapping("/mentorings/{mentoringId}/questions")
  @Operation(summary = "멘토링 질문 작성", description = "진행 중인 멘토링에 전용 질문을 작성합니다.")
  public ResponseEntity<ApiResponse<QuestionDetailResponse>> createQuestion(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "멘토링 ID", example = "1")
          @Positive(message = "mentoringId는 양수여야 합니다.")
          @PathVariable
          Long mentoringId,
      @Valid @RequestBody QuestionCreateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            mentoringQuestionService.createQuestion(
                requireUserId(authenticatedUserId), mentoringId, request)));
  }

  @GetMapping("/mentorings/{mentoringId}/questions")
  @Operation(summary = "멘토링 질문 목록 조회", description = "특정 멘토링의 전용 질문 목록을 최신순으로 조회합니다.")
  public ResponseEntity<ApiResponse<List<QuestionSummaryResponse>>> getQuestions(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "멘토링 ID", example = "1")
          @Positive(message = "mentoringId는 양수여야 합니다.")
          @PathVariable
          Long mentoringId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            mentoringQuestionService.getQuestions(
                requireUserId(authenticatedUserId), mentoringId)));
  }

  @GetMapping("/mentoring-questions/{questionId}")
  @Operation(summary = "멘토링 질문 상세 조회", description = "멘토링 전용 질문 상세와 답변 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<QuestionDetailResponse>> getQuestion(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "멘토링 질문 ID", example = "1")
          @Positive(message = "questionId는 양수여야 합니다.")
          @PathVariable
          Long questionId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            mentoringQuestionService.getQuestion(
                requireUserId(authenticatedUserId), questionId)));
  }

  @PostMapping("/mentoring-questions/{questionId}/answers")
  @Operation(summary = "멘토링 질문 답변 작성", description = "멘토링 전용 질문에 답변을 작성하고 질문 작성자에게 알림을 발송합니다.")
  public ResponseEntity<ApiResponse<AnswerResponse>> createAnswer(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "멘토링 질문 ID", example = "1")
          @Positive(message = "questionId는 양수여야 합니다.")
          @PathVariable
          Long questionId,
      @Valid @RequestBody AnswerCreateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            mentoringQuestionService.createAnswer(
                requireUserId(authenticatedUserId), questionId, request)));
  }

  @PatchMapping("/mentoring-questions/{questionId}/status")
  @Operation(summary = "멘토링 질문 상태 변경", description = "멘토링 질문 상태를 답변 대기 또는 답변 완료로 변경합니다.")
  public ResponseEntity<ApiResponse<QuestionDetailResponse>> updateStatus(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "멘토링 질문 ID", example = "1")
          @Positive(message = "questionId는 양수여야 합니다.")
          @PathVariable
          Long questionId,
      @Valid @RequestBody QuestionStatusUpdateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            mentoringQuestionService.updateStatus(
                requireUserId(authenticatedUserId), questionId, request)));
  }
}

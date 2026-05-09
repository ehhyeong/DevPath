package com.devpath.api.workspace;

import com.devpath.api.qna.dto.AnswerCreateRequest;
import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionStatusUpdateRequest;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.api.workspace.service.WorkspaceQuestionService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
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

@Tag(name = SwaggerTag.WORKSPACE_QNA, description = "팀 워크스페이스 전용 Q&A API")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class WorkspaceQuestionController {

  private final WorkspaceQuestionService workspaceQuestionService;

  @PostMapping("/workspaces/{workspaceId}/questions")
  @Operation(summary = "워크스페이스 질문 작성", description = "팀 워크스페이스에 전용 질문을 작성합니다.")
  public ResponseEntity<ApiResponse<QuestionDetailResponse>> createQuestion(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "워크스페이스 ID", example = "1")
          @Positive(message = "workspaceId는 양수여야 합니다.")
          @PathVariable
          Long workspaceId,
      @Valid @RequestBody QuestionCreateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            workspaceQuestionService.createQuestion(
                resolveUserId(authenticatedUserId, null), workspaceId, request)));
  }

  @GetMapping("/workspaces/{workspaceId}/questions")
  @Operation(summary = "워크스페이스 질문 목록 조회", description = "특정 워크스페이스의 전용 질문 목록을 최신순으로 조회합니다.")
  public ResponseEntity<ApiResponse<List<QuestionSummaryResponse>>> getQuestions(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "워크스페이스 ID", example = "1")
          @Positive(message = "workspaceId는 양수여야 합니다.")
          @PathVariable
          Long workspaceId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            workspaceQuestionService.getQuestions(
                resolveUserId(authenticatedUserId, null), workspaceId)));
  }

  @GetMapping("/workspace-questions/{questionId}")
  @Operation(summary = "워크스페이스 질문 상세 조회", description = "워크스페이스 전용 질문 상세와 답변 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<QuestionDetailResponse>> getQuestion(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "워크스페이스 질문 ID", example = "1")
          @Positive(message = "questionId는 양수여야 합니다.")
          @PathVariable
          Long questionId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            workspaceQuestionService.getQuestion(
                resolveUserId(authenticatedUserId, null), questionId)));
  }

  @PostMapping("/workspace-questions/{questionId}/answers")
  @Operation(
      summary = "워크스페이스 질문 답변 작성",
      description = "워크스페이스 전용 질문에 답변을 작성하고 질문 작성자에게 알림을 발송합니다.")
  public ResponseEntity<ApiResponse<AnswerResponse>> createAnswer(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "워크스페이스 질문 ID", example = "1")
          @Positive(message = "questionId는 양수여야 합니다.")
          @PathVariable
          Long questionId,
      @Valid @RequestBody AnswerCreateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            workspaceQuestionService.createAnswer(
                resolveUserId(authenticatedUserId, null), questionId, request)));
  }

  @PatchMapping("/workspace-questions/{questionId}/status")
  @Operation(summary = "워크스페이스 질문 상태 변경", description = "워크스페이스 질문 상태를 답변 대기 또는 답변 완료로 변경합니다.")
  public ResponseEntity<ApiResponse<QuestionDetailResponse>> updateStatus(
      @Parameter(hidden = true) @AuthenticationPrincipal Long authenticatedUserId,
      @Parameter(description = "워크스페이스 질문 ID", example = "1")
          @Positive(message = "questionId는 양수여야 합니다.")
          @PathVariable
          Long questionId,
      @Valid @RequestBody QuestionStatusUpdateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            workspaceQuestionService.updateStatus(
                resolveUserId(authenticatedUserId, null), questionId, request)));
  }

  private Long resolveUserId(Long authenticatedUserId, Long requestUserId) {
    if (authenticatedUserId != null) {
      return authenticatedUserId;
    }

    if (requestUserId != null) {
      return requestUserId;
    }

    throw new CustomException(ErrorCode.INVALID_INPUT, "userId is required.");
  }
}

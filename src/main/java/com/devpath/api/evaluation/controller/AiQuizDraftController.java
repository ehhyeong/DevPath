package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.AdoptAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.request.CreateAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.request.RejectAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.request.UpdateAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.response.AiQuizDraftResponse;
import com.devpath.api.evaluation.dto.response.AiQuizEvidenceResponse;
import com.devpath.api.evaluation.service.AiQuizDraftService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - AI 퀴즈 초안", description = "강사용 AI 퀴즈 초안 생성, 수정, 채택, 거부, 근거 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/instructor/ai-quiz-drafts")
public class AiQuizDraftController {

  // Evaluation Swagger 문서화 기준에 맞춘 AI 퀴즈 초안 컨트롤러다.
  private final AiQuizDraftService aiQuizDraftService;

  @Operation(
      summary = "AI 퀴즈 초안 생성",
      description =
          "로드맵 노드와 근거 원문을 기반으로 Mock AI 퀴즈 초안을 생성합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping
  public ResponseEntity<ApiResponse<AiQuizDraftResponse>> createDraft(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Valid @RequestBody CreateAiQuizDraftRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("AI 퀴즈 초안이 생성되었습니다.", aiQuizDraftService.createDraft(userId, request)));
  }

  @Operation(
      summary = "AI 퀴즈 초안 채택",
      description =
          "Mock 저장소의 초안을 채택하고 실제 Quiz, QuizQuestion, QuizQuestionOption 데이터를 생성합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/{draftId}/adopt")
  public ResponseEntity<ApiResponse<AiQuizDraftResponse>> adoptDraft(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Parameter(description = "AI 퀴즈 초안 ID", example = "1") @PathVariable Long draftId,
      @Valid @RequestBody AdoptAiQuizDraftRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "AI 퀴즈 초안이 채택되었습니다.", aiQuizDraftService.adoptDraft(userId, draftId, request)));
  }

  @Operation(
      summary = "AI 퀴즈 초안 거부",
      description =
          "Mock 저장소의 초안을 거부 상태로 변경하고 거부 사유를 기록합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/{draftId}/reject")
  public ResponseEntity<ApiResponse<AiQuizDraftResponse>> rejectDraft(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Parameter(description = "AI 퀴즈 초안 ID", example = "1") @PathVariable Long draftId,
      @Valid @RequestBody RejectAiQuizDraftRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "AI 퀴즈 초안이 거부되었습니다.", aiQuizDraftService.rejectDraft(userId, draftId, request)));
  }

  @Operation(
      summary = "AI 퀴즈 초안 수정",
      description =
          "Mock 저장소의 초안 제목, 설명, 문항, 선택지를 수정합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PutMapping("/{draftId}")
  public ResponseEntity<ApiResponse<AiQuizDraftResponse>> updateDraft(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Parameter(description = "AI 퀴즈 초안 ID", example = "1") @PathVariable Long draftId,
      @Valid @RequestBody UpdateAiQuizDraftRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "AI 퀴즈 초안이 수정되었습니다.", aiQuizDraftService.updateDraft(userId, draftId, request)));
  }

  @Operation(
      summary = "AI 퀴즈 근거 구간 조회",
      description =
          "AI 퀴즈 초안의 문항별 근거 발췌문과 타임스탬프 정보를 조회합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @GetMapping("/{draftId}/evidence")
  public ResponseEntity<ApiResponse<AiQuizEvidenceResponse>> getEvidence(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Parameter(description = "AI 퀴즈 초안 ID", example = "1") @PathVariable Long draftId) {
    return ResponseEntity.ok(ApiResponse.ok(aiQuizDraftService.getEvidence(userId, draftId)));
  }
}

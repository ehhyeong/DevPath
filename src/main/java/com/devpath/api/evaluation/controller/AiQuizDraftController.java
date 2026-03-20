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

@Tag(name = "Instructor - AI Quiz Draft", description = "강사용 AI 퀴즈 초안 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/instructor/ai-quiz-drafts")
public class AiQuizDraftController {

  private final AiQuizDraftService aiQuizDraftService;

  @Operation(
      summary = "AI 퀴즈 초안 생성",
      description = "근거 원문과 노드 정보를 바탕으로 Mock AI 퀴즈 초안을 생성합니다.")
  @PostMapping
  public ResponseEntity<ApiResponse<AiQuizDraftResponse>> createDraft(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Valid @RequestBody CreateAiQuizDraftRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("AI 퀴즈 초안이 생성되었습니다.", aiQuizDraftService.createDraft(userId, request)));
  }

  @Operation(
      summary = "AI 퀴즈 초안 채택",
      description = "Mock 초안을 실제 Quiz, QuizQuestion, QuizQuestionOption 데이터로 생성합니다.")
  @PostMapping("/{draftId}/adopt")
  public ResponseEntity<ApiResponse<AiQuizDraftResponse>> adoptDraft(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Parameter(description = "AI 초안 ID", example = "1") @PathVariable Long draftId,
      @Valid @RequestBody AdoptAiQuizDraftRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "AI 퀴즈 초안이 채택되었습니다.", aiQuizDraftService.adoptDraft(userId, draftId, request)));
  }

  @Operation(summary = "AI 퀴즈 초안 거부", description = "초안을 거부 상태로 변경하고 거부 사유를 저장합니다.")
  @PostMapping("/{draftId}/reject")
  public ResponseEntity<ApiResponse<AiQuizDraftResponse>> rejectDraft(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Parameter(description = "AI 초안 ID", example = "1") @PathVariable Long draftId,
      @Valid @RequestBody RejectAiQuizDraftRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "AI 퀴즈 초안이 거부되었습니다.", aiQuizDraftService.rejectDraft(userId, draftId, request)));
  }

  @Operation(summary = "AI 퀴즈 초안 수정", description = "초안 제목, 설명, 문항, 선택지를 수정합니다.")
  @PutMapping("/{draftId}")
  public ResponseEntity<ApiResponse<AiQuizDraftResponse>> updateDraft(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Parameter(description = "AI 초안 ID", example = "1") @PathVariable Long draftId,
      @Valid @RequestBody UpdateAiQuizDraftRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "AI 퀴즈 초안이 수정되었습니다.", aiQuizDraftService.updateDraft(userId, draftId, request)));
  }

  @Operation(summary = "AI 퀴즈 생성 근거 구간 조회", description = "문항별 근거 발췌문과 구간 정보를 조회합니다.")
  @GetMapping("/{draftId}/evidence")
  public ResponseEntity<ApiResponse<AiQuizEvidenceResponse>> getEvidence(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId,
      @Parameter(description = "AI 초안 ID", example = "1") @PathVariable Long draftId) {
    return ResponseEntity.ok(ApiResponse.ok(aiQuizDraftService.getEvidence(userId, draftId)));
  }
}

package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.qna.QnaAnswerRequest;
import com.devpath.api.instructor.dto.qna.QnaAnswerResponse;
import com.devpath.api.instructor.dto.qna.QnaDraftRequest;
import com.devpath.api.instructor.dto.qna.QnaDraftResponse;
import com.devpath.api.instructor.dto.qna.QnaInboxResponse;
import com.devpath.api.instructor.dto.qna.QnaStatusUpdateRequest;
import com.devpath.api.instructor.dto.qna.QnaTemplateRequest;
import com.devpath.api.instructor.dto.qna.QnaTemplateResponse;
import com.devpath.api.instructor.dto.qna.QnaTimelineResponse;
import com.devpath.api.instructor.service.InstructorQnaInboxService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.qna.entity.QnaStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강사 - QnA 인박스", description = "강사 QnA 인박스 관리 API")
@RestController
@RequestMapping("/api/instructor/qna-inbox")
@RequiredArgsConstructor
public class InstructorQnaInboxController {

  private final InstructorQnaInboxService instructorQnaInboxService;

  @Operation(summary = "QnA 인박스 목록 조회", description = "status 파라미터로 미답변/답변완료 필터")
  @GetMapping
  public ApiResponse<List<QnaInboxResponse>> getInbox(
      @Parameter(description = "QnA 상태 필터") @RequestParam(required = false) QnaStatus status,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "QnA Inbox 조회 성공", instructorQnaInboxService.getInbox(userId, status));
  }

  @Operation(summary = "질문 상태 변경")
  @PatchMapping("/{questionId}/status")
  public ApiResponse<Void> updateStatus(
      @PathVariable Long questionId,
      @Valid @RequestBody QnaStatusUpdateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    instructorQnaInboxService.updateStatus(questionId, userId, request);
    return ApiResponse.success("질문 상태가 변경되었습니다.", null);
  }

  @Operation(summary = "답변 임시저장", description = "이미 임시저장이 있으면 덮어쓴다")
  @PostMapping("/{questionId}/drafts")
  public ApiResponse<QnaDraftResponse> saveDraft(
      @PathVariable Long questionId,
      @Valid @RequestBody QnaDraftRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "임시저장되었습니다.", instructorQnaInboxService.saveDraft(questionId, userId, request));
  }

  @Operation(summary = "답변 등록")
  @PostMapping("/{questionId}/answers")
  public ApiResponse<QnaAnswerResponse> createAnswer(
      @PathVariable Long questionId,
      @Valid @RequestBody QnaAnswerRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "답변이 등록되었습니다.", instructorQnaInboxService.createAnswer(questionId, userId, request));
  }

  @Operation(summary = "답변 수정")
  @PutMapping("/{questionId}/answers/{answerId}")
  public ApiResponse<QnaAnswerResponse> updateAnswer(
      @PathVariable Long questionId,
      @PathVariable Long answerId,
      @Valid @RequestBody QnaAnswerRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "답변이 수정되었습니다.",
        instructorQnaInboxService.updateAnswer(questionId, answerId, userId, request));
  }

  @Operation(summary = "질문 타임라인 컨텍스트 조회", description = "질문 원문 + 답변 이력 + 임시저장 통합 반환")
  @GetMapping("/{questionId}/timeline")
  public ApiResponse<QnaTimelineResponse> getTimeline(
      @PathVariable Long questionId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "타임라인 조회 성공", instructorQnaInboxService.getTimeline(questionId, userId));
  }

  @Operation(summary = "QnA 답변 템플릿 등록")
  @PostMapping("/templates")
  public ApiResponse<QnaTemplateResponse> createTemplate(
      @Valid @RequestBody QnaTemplateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "템플릿이 등록되었습니다.", instructorQnaInboxService.createTemplate(userId, request));
  }

  @Operation(summary = "QnA 답변 템플릿 목록 조회")
  @GetMapping("/templates")
  public ApiResponse<List<QnaTemplateResponse>> getTemplates(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success("템플릿 목록 조회 성공", instructorQnaInboxService.getTemplates(userId));
  }

  @Operation(summary = "QnA 답변 템플릿 수정")
  @PutMapping("/templates/{templateId}")
  public ApiResponse<QnaTemplateResponse> updateTemplate(
      @PathVariable Long templateId,
      @Valid @RequestBody QnaTemplateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "템플릿이 수정되었습니다.", instructorQnaInboxService.updateTemplate(templateId, userId, request));
  }

  @Operation(summary = "QnA 답변 템플릿 삭제")
  @DeleteMapping("/templates/{templateId}")
  public ApiResponse<Void> deleteTemplate(
      @PathVariable Long templateId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    instructorQnaInboxService.deleteTemplate(templateId, userId);
    return ApiResponse.success("템플릿이 삭제되었습니다.", null);
  }
}

package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.qna.*;
import com.devpath.api.instructor.service.InstructorQnaInboxService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Instructor - QnA Inbox", description = "강사 QnA Inbox 관리 API")
@RestController
@RequestMapping("/api/instructor/qna-inbox")
@RequiredArgsConstructor
public class InstructorQnaInboxController {

    private final InstructorQnaInboxService instructorQnaInboxService;

    @Operation(summary = "QnA Inbox 목록 조회", description = "status 파라미터로 미답변/답변완료 필터")
    @GetMapping
    public ApiResponse<List<QnaInboxResponse>> getInbox(
            @Parameter(description = "QnA 상태 필터 (UNANSWERED/ANSWERED)") @RequestParam(required = false) String status,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("QnA Inbox 조회 성공", instructorQnaInboxService.getInbox(userId, status));
    }

    @Operation(summary = "질문 상태 변경")
    @PatchMapping("/{questionId}/status")
    public ApiResponse<Void> updateStatus(
            @PathVariable Long questionId,
            @RequestBody @Valid QnaStatusUpdateRequest request) {
        instructorQnaInboxService.updateStatus(questionId, request);
        return ApiResponse.success("질문 상태가 변경되었습니다.", null);
    }

    @Operation(summary = "답변 임시저장", description = "이미 임시저장이 있으면 덮어씀")
    @PostMapping("/{questionId}/drafts")
    public ApiResponse<QnaDraftResponse> saveDraft(
            @PathVariable Long questionId,
            @RequestBody @Valid QnaDraftRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("임시저장되었습니다.", instructorQnaInboxService.saveDraft(questionId, userId, request));
    }

    @Operation(summary = "답변 등록")
    @PostMapping("/{questionId}/answers")
    public ApiResponse<QnaAnswerResponse> createAnswer(
            @PathVariable Long questionId,
            @RequestBody @Valid QnaAnswerRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("답변이 등록되었습니다.", instructorQnaInboxService.createAnswer(questionId, userId, request));
    }

    @Operation(summary = "답변 수정")
    @PutMapping("/{questionId}/answers/{answerId}")
    public ApiResponse<QnaAnswerResponse> updateAnswer(
            @PathVariable Long questionId,
            @PathVariable Long answerId,
            @RequestBody @Valid QnaAnswerRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("답변이 수정되었습니다.", instructorQnaInboxService.updateAnswer(questionId, answerId, userId, request));
    }

    @Operation(summary = "질문 타임라인/컨텍스트 조회", description = "질문 원문 + 답변 이력 + 임시저장 통합 반환")
    @GetMapping("/{questionId}/timeline")
    public ApiResponse<QnaTimelineResponse> getTimeline(
            @PathVariable Long questionId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("타임라인 조회 성공", instructorQnaInboxService.getTimeline(questionId, userId));
    }

    @Operation(summary = "QnA 답변 템플릿 등록")
    @PostMapping("/templates")
    public ApiResponse<QnaTemplateResponse> createTemplate(
            @RequestBody @Valid QnaTemplateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("템플릿이 등록되었습니다.", instructorQnaInboxService.createTemplate(userId, request));
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
            @RequestBody @Valid QnaTemplateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("템플릿이 수정되었습니다.", instructorQnaInboxService.updateTemplate(templateId, userId, request));
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
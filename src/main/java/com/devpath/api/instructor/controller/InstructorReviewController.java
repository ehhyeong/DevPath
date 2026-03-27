package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.review.*;
import com.devpath.api.instructor.service.InstructorReviewService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Instructor - Review Operations", description = "강사 리뷰 관리 API")
@RestController
@RequestMapping("/api/instructor/reviews")
@RequiredArgsConstructor
public class InstructorReviewController {

    private final InstructorReviewService instructorReviewService;

    @Operation(summary = "리뷰 답글 등록")
    @PostMapping("/{reviewId}/replies")
    public ApiResponse<ReviewReplyResponse> createReply(
            @PathVariable Long reviewId,
            @RequestBody @Valid ReviewReplyRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("답글이 등록되었습니다.", instructorReviewService.createReply(reviewId, userId, request));
    }

    @Operation(summary = "리뷰 답글 수정")
    @PutMapping("/{reviewId}/replies/{replyId}")
    public ApiResponse<ReviewReplyResponse> updateReply(
            @PathVariable Long reviewId,
            @PathVariable Long replyId,
            @RequestBody @Valid ReviewReplyRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("답글이 수정되었습니다.", instructorReviewService.updateReply(reviewId, replyId, userId, request));
    }

    @Operation(summary = "리뷰 답글 삭제")
    @DeleteMapping("/{reviewId}/replies/{replyId}")
    public ApiResponse<Void> deleteReply(
            @PathVariable Long reviewId,
            @PathVariable Long replyId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorReviewService.deleteReply(reviewId, replyId, userId);
        return ApiResponse.success("답글이 삭제되었습니다.", null);
    }

    @Operation(summary = "리뷰 상태 변경", description = "UNANSWERED/ANSWERED/UNSATISFIED")
    @PatchMapping("/{reviewId}/status")
    public ApiResponse<Void> updateStatus(
            @PathVariable Long reviewId,
            @RequestBody @Valid ReviewStatusUpdateRequest request) {
        instructorReviewService.updateStatus(reviewId, request);
        return ApiResponse.success("리뷰 상태가 변경되었습니다.", null);
    }

    @Operation(summary = "리뷰 이슈 태깅")
    @PostMapping("/{reviewId}/issue-tags")
    public ApiResponse<Void> addIssueTags(
            @PathVariable Long reviewId,
            @RequestBody @Valid ReviewIssueTagRequest request) {
        instructorReviewService.addIssueTags(reviewId, request);
        return ApiResponse.success("이슈 태그가 추가되었습니다.", null);
    }

    @Operation(summary = "리뷰 helpful 집계 조회", description = "답변률, 상태별 건수 반환")
    @GetMapping("/helpful")
    public ApiResponse<ReviewHelpfulResponse> getHelpfulStats(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("집계 조회 성공", instructorReviewService.getHelpfulStats(userId));
    }

    @Operation(summary = "빠른 답변 템플릿 등록")
    @PostMapping("/templates")
    public ApiResponse<ReviewTemplateResponse> createTemplate(
            @RequestBody @Valid ReviewTemplateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("템플릿이 등록되었습니다.", instructorReviewService.createTemplate(userId, request));
    }

    @Operation(summary = "빠른 답변 템플릿 목록 조회")
    @GetMapping("/templates")
    public ApiResponse<List<ReviewTemplateResponse>> getTemplates(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("템플릿 목록 조회 성공", instructorReviewService.getTemplates(userId));
    }

    @Operation(summary = "템플릿 수정")
    @PutMapping("/templates/{templateId}")
    public ApiResponse<ReviewTemplateResponse> updateTemplate(
            @PathVariable Long templateId,
            @RequestBody @Valid ReviewTemplateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("템플릿이 수정되었습니다.", instructorReviewService.updateTemplate(templateId, userId, request));
    }

    @Operation(summary = "템플릿 삭제")
    @DeleteMapping("/templates/{templateId}")
    public ApiResponse<Void> deleteTemplate(
            @PathVariable Long templateId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorReviewService.deleteTemplate(templateId, userId);
        return ApiResponse.success("템플릿이 삭제되었습니다.", null);
    }

    @Operation(summary = "리뷰 숨김 처리")
    @PostMapping("/{reviewId}/hide")
    public ApiResponse<Void> hideReview(
            @PathVariable Long reviewId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorReviewService.hideReview(reviewId, userId);
        return ApiResponse.success("리뷰가 숨김 처리되었습니다.", null);
    }

    @Operation(summary = "리뷰 신고 처리")
    @PostMapping("/{reviewId}/reports/resolve")
    public ApiResponse<Void> resolveReport(
            @PathVariable Long reviewId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorReviewService.resolveReport(reviewId, userId);
        return ApiResponse.success("신고가 처리되었습니다.", null);
    }
}
package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.community.*;
import com.devpath.api.instructor.service.InstructorCommunityService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Instructor - Community", description = "강사 채널 커뮤니티 API")
@RestController
@RequestMapping("/api/instructor/community")
@RequiredArgsConstructor
public class InstructorCommunityController {

    private final InstructorCommunityService instructorCommunityService;

    @Operation(summary = "채널 게시글 생성")
    @PostMapping("/posts")
    public ApiResponse<CommunityPostResponse> createPost(
            @RequestBody @Valid CommunityPostRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("게시글이 생성되었습니다.", instructorCommunityService.createPost(userId, request));
    }

    @Operation(summary = "채널 게시글 수정")
    @PutMapping("/posts/{postId}")
    public ApiResponse<CommunityPostResponse> updatePost(
            @PathVariable Long postId,
            @RequestBody @Valid CommunityPostRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("게시글이 수정되었습니다.", instructorCommunityService.updatePost(userId, postId, request));
    }

    @Operation(summary = "채널 게시글 삭제")
    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Void> deletePost(
            @PathVariable Long postId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorCommunityService.deletePost(userId, postId);
        return ApiResponse.success("게시글이 삭제되었습니다.", null);
    }

    @Operation(summary = "채널 게시글 목록 조회", description = "정렬(sort=latest/popular), 타입(type=NOTICE/GENERAL) 필터 지원")
    @GetMapping("/posts")
    public ApiResponse<List<CommunityPostResponse>> getPosts(
            @Parameter(description = "강사 채널 ID") @RequestParam Long instructorId,
            @Parameter(description = "정렬 기준 (latest/popular)") @RequestParam(defaultValue = "latest") String sort,
            @Parameter(description = "게시글 타입 필터 (NOTICE/GENERAL)") @RequestParam(required = false) String type) {
        return ApiResponse.success("게시글 목록 조회 성공", instructorCommunityService.getPosts(instructorId, sort, type));
    }

    @Operation(summary = "채널 게시글 상세 조회")
    @GetMapping("/posts/{postId}")
    public ApiResponse<CommunityPostResponse> getPost(@PathVariable Long postId) {
        return ApiResponse.success("게시글 조회 성공", instructorCommunityService.getPost(postId));
    }

    @Operation(summary = "댓글 등록")
    @PostMapping("/posts/{postId}/comments")
    public ApiResponse<CommunityCommentResponse> addComment(
            @PathVariable Long postId,
            @RequestBody @Valid CommunityCommentRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("댓글이 등록되었습니다.", instructorCommunityService.addComment(postId, userId, request));
    }

    @Operation(summary = "대댓글 등록")
    @PostMapping("/comments/{commentId}/replies")
    public ApiResponse<CommunityCommentResponse> addReply(
            @PathVariable Long commentId,
            @RequestBody @Valid CommunityCommentRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("대댓글이 등록되었습니다.", instructorCommunityService.addReply(commentId, userId, request));
    }

    @Operation(summary = "댓글 수정")
    @PutMapping("/comments/{commentId}")
    public ApiResponse<CommunityCommentResponse> updateComment(
            @PathVariable Long commentId,
            @RequestBody @Valid CommunityCommentRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("댓글이 수정되었습니다.", instructorCommunityService.updateComment(userId, commentId, request));
    }

    @Operation(summary = "댓글 삭제")
    @DeleteMapping("/comments/{commentId}")
    public ApiResponse<Void> deleteComment(
            @PathVariable Long commentId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorCommunityService.deleteComment(userId, commentId);
        return ApiResponse.success("댓글이 삭제되었습니다.", null);
    }

    @Operation(summary = "게시글 좋아요 toggle")
    @PostMapping("/posts/{postId}/likes")
    public ApiResponse<Void> togglePostLike(
            @PathVariable Long postId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorCommunityService.togglePostLike(postId, userId);
        return ApiResponse.success("좋아요가 처리되었습니다.", null);
    }

    @Operation(summary = "댓글 좋아요 toggle")
    @PostMapping("/comments/{commentId}/likes")
    public ApiResponse<Void> toggleCommentLike(
            @PathVariable Long commentId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorCommunityService.toggleCommentLike(commentId, userId);
        return ApiResponse.success("좋아요가 처리되었습니다.", null);
    }

    @Operation(summary = "채널 커뮤니티 집계 조회")
    @GetMapping("/summary")
    public ApiResponse<CommunitySummaryResponse> getSummary(@Parameter(description = "강사 채널 ID") @RequestParam Long instructorId) {
        return ApiResponse.success("집계 조회 성공", instructorCommunityService.getSummary(instructorId));
    }
}
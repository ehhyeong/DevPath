package com.devpath.api.community.controller;

import com.devpath.api.community.dto.PostLikeResponse;
import com.devpath.api.community.service.CommunityPostLikeService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Tag(name = "Community Like API", description = "커뮤니티 게시글 좋아요 API")
public class CommunityPostLikeController {

    private final CommunityPostLikeService communityPostLikeService;

    @PostMapping("/{postId}/likes")
    @Operation(summary = "게시글 좋아요", description = "특정 게시글에 좋아요를 등록합니다.")
    public ApiResponse<PostLikeResponse> likePost(
            @Parameter(description = "좋아요 요청 사용자 ID", example = "1")
            @RequestParam Long userId,
            @Parameter(description = "게시글 ID", example = "10")
            @PathVariable Long postId
    ) {
        PostLikeResponse response = communityPostLikeService.likePost(userId, postId);
        return ApiResponse.ok(response);
    }

    @DeleteMapping("/{postId}/likes")
    @Operation(summary = "게시글 좋아요 취소", description = "특정 게시글의 좋아요를 취소합니다.")
    public ApiResponse<PostLikeResponse> unlikePost(
            @Parameter(description = "좋아요 취소 요청 사용자 ID", example = "1")
            @RequestParam Long userId,
            @Parameter(description = "게시글 ID", example = "10")
            @PathVariable Long postId
    ) {
        PostLikeResponse response = communityPostLikeService.unlikePost(userId, postId);
        return ApiResponse.ok(response);
    }
}

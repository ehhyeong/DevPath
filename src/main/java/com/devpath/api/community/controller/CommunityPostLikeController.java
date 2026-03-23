package com.devpath.api.community.controller;

import com.devpath.api.community.dto.PostLikeResponse;
import com.devpath.api.community.service.CommunityPostLikeService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerDocConstants;
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
@Tag(
        name = "Community Like API",
        description = "커뮤니티 게시글 좋아요 API입니다. Swagger 테스트 기준으로 userId=2를 상호작용 사용자로 사용하면 됩니다."
)
public class CommunityPostLikeController {

    private final CommunityPostLikeService communityPostLikeService;

    @PostMapping("/{postId}/likes")
    @Operation(summary = "게시글 좋아요", description = "특정 게시글에 좋아요를 등록합니다.")
    public ApiResponse<PostLikeResponse> likePost(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "2")
            @RequestParam Long userId,
            @Parameter(description = "좋아요를 누를 게시글 ID입니다.", example = "10")
            @PathVariable Long postId
    ) {
        PostLikeResponse response = communityPostLikeService.likePost(userId, postId);
        return ApiResponse.ok(response);
    }

    @DeleteMapping("/{postId}/likes")
    @Operation(summary = "게시글 좋아요 취소", description = "특정 게시글의 좋아요를 취소합니다.")
    public ApiResponse<PostLikeResponse> unlikePost(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "2")
            @RequestParam Long userId,
            @Parameter(description = "좋아요를 취소할 게시글 ID입니다.", example = "10")
            @PathVariable Long postId
    ) {
        PostLikeResponse response = communityPostLikeService.unlikePost(userId, postId);
        return ApiResponse.ok(response);
    }
}

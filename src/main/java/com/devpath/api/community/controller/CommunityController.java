package com.devpath.api.community.controller;

import com.devpath.api.community.dto.MyPostResponse;
import com.devpath.api.community.dto.PostPageResponse;
import com.devpath.api.community.dto.PostRequest;
import com.devpath.api.community.dto.PostResponse;
import com.devpath.api.community.dto.PostUpdateRequest;
import com.devpath.api.community.service.CommunityService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.community.entity.CommunityCategory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Tag(name = "Community API", description = "일반 커뮤니티 게시판 CRUD API")
public class CommunityController {

    private final CommunityService communityService;

    @PostMapping
    @Operation(summary = "게시글 작성", description = "커뮤니티에 새로운 글을 작성합니다.")
    public ApiResponse<PostResponse> createPost(
            @Parameter(description = "작성자 사용자 ID", example = "1")
            @RequestParam Long userId,
            @Valid @RequestBody PostRequest request
    ) {
        PostResponse response = communityService.createPost(userId, request);
        return ApiResponse.ok(response);
    }

    @GetMapping
    @Operation(
            summary = "게시글 목록 조회",
            description = "카테고리, 작성자, 키워드 조건으로 게시글을 조회하고 latest / popular / mostViewed 정렬을 지원합니다."
    )
    public ApiResponse<PostPageResponse> getPosts(
            @Parameter(description = "게시판 카테고리", example = "TECH_SHARE")
            @RequestParam(required = false) CommunityCategory category,
            @Parameter(description = "특정 작성자 ID", example = "1")
            @RequestParam(required = false) Long authorId,
            @Parameter(description = "제목/내용 검색 키워드", example = "spring")
            @RequestParam(required = false) String keyword,
            @Parameter(description = "정렬 기준: latest, popular, mostViewed", example = "latest")
            @RequestParam(defaultValue = "latest") String sort,
            @Parameter(description = "페이지 번호", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기", example = "10")
            @RequestParam(defaultValue = "10") int size
    ) {
        PostPageResponse response = communityService.searchPosts(category, authorId, keyword, sort, page, size);
        return ApiResponse.ok(response);
    }

    @GetMapping("/{postId}")
    @Operation(summary = "게시글 상세 조회", description = "게시글 상세 정보를 조회하고 조회수를 증가시킵니다.")
    public ApiResponse<PostResponse> getPostDetail(
            @Parameter(description = "게시글 ID", example = "10")
            @PathVariable Long postId
    ) {
        PostResponse response = communityService.getPostDetail(postId);
        return ApiResponse.ok(response);
    }

    @PutMapping("/{postId}")
    @Operation(summary = "게시글 수정", description = "작성자 본인만 게시글을 수정할 수 있습니다.")
    public ApiResponse<PostResponse> updatePost(
            @Parameter(description = "수정 요청 사용자 ID", example = "1")
            @RequestParam Long userId,
            @Parameter(description = "게시글 ID", example = "10")
            @PathVariable Long postId,
            @Valid @RequestBody PostUpdateRequest request
    ) {
        PostResponse response = communityService.updatePost(userId, postId, request);
        return ApiResponse.ok(response);
    }

    @DeleteMapping("/{postId}")
    @Operation(summary = "게시글 삭제", description = "작성자 본인만 게시글을 삭제할 수 있습니다.")
    public ApiResponse<Void> deletePost(
            @Parameter(description = "삭제 요청 사용자 ID", example = "1")
            @RequestParam Long userId,
            @Parameter(description = "게시글 ID", example = "10")
            @PathVariable Long postId
    ) {
        communityService.deletePost(userId, postId);
        return ApiResponse.ok();
    }

    @GetMapping("/me")
    @Operation(summary = "내 게시글 목록 조회", description = "특정 사용자가 작성한 삭제되지 않은 게시글 목록을 최신순으로 조회합니다.")
    public ApiResponse<List<MyPostResponse>> getMyPosts(
            @Parameter(description = "조회 대상 사용자 ID", example = "1")
            @RequestParam Long userId
    ) {
        List<MyPostResponse> responses = communityService.getMyPosts(userId);
        return ApiResponse.ok(responses);
    }
}

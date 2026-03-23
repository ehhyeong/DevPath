package com.devpath.api.community.controller;

import com.devpath.api.community.dto.MyPostResponse;
import com.devpath.api.community.dto.PostPageResponse;
import com.devpath.api.community.dto.PostRequest;
import com.devpath.api.community.dto.PostResponse;
import com.devpath.api.community.dto.PostUpdateRequest;
import com.devpath.api.community.service.CommunityService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerDocConstants;
import com.devpath.domain.community.entity.CommunityCategory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
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
@Tag(
        name = "Community API",
        description = "일반 커뮤니티 게시판 API입니다. Swagger 단독 테스트 기준으로 userId=1은 글 작성자, userId=2는 상호작용 사용자로 테스트하면 됩니다."
)
public class CommunityController {

    private final CommunityService communityService;

    @PostMapping
    @Operation(summary = "게시글 작성", description = "커뮤니티에 새로운 글을 작성합니다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "게시글 작성 성공",
                    content = @Content(schema = @Schema(implementation = PostResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "사용자를 찾을 수 없음")
    })
    public ApiResponse<PostResponse> createPost(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
            @RequestParam Long userId,
            @Valid @RequestBody PostRequest request
    ) {
        PostResponse response = communityService.createPost(userId, request);
        return ApiResponse.ok(response);
    }

    @GetMapping
    @Operation(
            summary = "게시글 목록 조회",
            description = "카테고리, 작성자, 키워드, 정렬 기준(latest/popular/mostViewed), 페이지 정보를 조합해 게시글 목록을 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "게시글 목록 조회 성공",
                    content = @Content(schema = @Schema(implementation = PostPageResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "잘못된 정렬 조건 또는 요청 파라미터")
    })
    public ApiResponse<PostPageResponse> getPosts(
            @Parameter(description = SwaggerDocConstants.COMMUNITY_CATEGORY_DESCRIPTION, example = "TECH_SHARE")
            @RequestParam(required = false) CommunityCategory category,

            @Parameter(description = "특정 작성자의 게시글만 조회할 때 사용하는 작성자 ID입니다.", example = "1")
            @RequestParam(required = false) Long authorId,

            @Parameter(description = "제목/내용 검색 키워드입니다.", example = "spring")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "정렬 기준입니다. latest=최신순, popular=좋아요순, mostViewed=조회수순", example = "latest")
            @RequestParam(defaultValue = "latest") String sort,

            @Parameter(description = "페이지 번호입니다. 0부터 시작합니다.", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "페이지 크기입니다.", example = "10")
            @RequestParam(defaultValue = "10") int size
    ) {
        PostPageResponse response = communityService.searchPosts(category, authorId, keyword, sort, page, size);
        return ApiResponse.ok(response);
    }

    @GetMapping("/{postId}")
    @Operation(summary = "게시글 상세 조회", description = "게시글 상세 정보를 조회하고 조회수를 1 증가시킵니다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "게시글 상세 조회 성공",
                    content = @Content(schema = @Schema(implementation = PostResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "게시글을 찾을 수 없음")
    })
    public ApiResponse<PostResponse> getPostDetail(
            @Parameter(description = "게시글 ID입니다.", example = "10")
            @PathVariable Long postId
    ) {
        PostResponse response = communityService.getPostDetail(postId);
        return ApiResponse.ok(response);
    }

    @PutMapping("/{postId}")
    @Operation(summary = "게시글 수정", description = "작성자 본인만 게시글을 수정할 수 있습니다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "게시글 수정 성공",
                    content = @Content(schema = @Schema(implementation = PostResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "수정 권한 없음"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "게시글을 찾을 수 없음")
    })
    public ApiResponse<PostResponse> updatePost(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
            @RequestParam Long userId,
            @Parameter(description = "수정할 게시글 ID입니다.", example = "10")
            @PathVariable Long postId,
            @Valid @RequestBody PostUpdateRequest request
    ) {
        PostResponse response = communityService.updatePost(userId, postId, request);
        return ApiResponse.ok(response);
    }

    @DeleteMapping("/{postId}")
    @Operation(summary = "게시글 삭제", description = "작성자 본인만 게시글을 삭제할 수 있습니다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "게시글 삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "삭제 권한 없음"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "게시글을 찾을 수 없음")
    })
    public ApiResponse<Void> deletePost(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
            @RequestParam Long userId,
            @Parameter(description = "삭제할 게시글 ID입니다.", example = "10")
            @PathVariable Long postId
    ) {
        communityService.deletePost(userId, postId);
        return ApiResponse.ok();
    }

    @GetMapping("/me")
    @Operation(summary = "내 게시글 목록 조회", description = "특정 사용자가 작성한 게시글 목록을 최신순으로 조회합니다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "내 게시글 목록 조회 성공",
                    content = @Content(schema = @Schema(implementation = MyPostResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "사용자를 찾을 수 없음")
    })
    public ApiResponse<List<MyPostResponse>> getMyPosts(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
            @RequestParam Long userId
    ) {
        List<MyPostResponse> responses = communityService.getMyPosts(userId);
        return ApiResponse.ok(responses);
    }
}

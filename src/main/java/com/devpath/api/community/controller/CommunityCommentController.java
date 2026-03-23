package com.devpath.api.community.controller;

import com.devpath.api.community.dto.CommentCreateRequest;
import com.devpath.api.community.dto.CommentResponse;
import com.devpath.api.community.service.CommunityCommentService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerDocConstants;
import com.devpath.common.swagger.SwaggerErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(
        name = "Community Comment API",
        description = "커뮤니티 댓글/대댓글 API입니다. Swagger 테스트 기준으로 userId=1은 게시글 작성자, userId=2는 댓글 작성자로 사용하면 됩니다."
)
public class CommunityCommentController {

    private final CommunityCommentService communityCommentService;

    @PostMapping("/posts/{postId}/comments")
    @Operation(summary = "댓글 작성", description = "특정 게시글에 댓글을 작성합니다.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "댓글 작성 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "잘못된 요청",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "사용자 또는 게시글을 찾을 수 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))
            )
    })
    public ApiResponse<CommentResponse> createComment(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "2")
            @RequestParam Long userId,
            @Parameter(description = "댓글을 작성할 게시글 ID입니다.", example = "10")
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateRequest request
    ) {
        CommentResponse response = communityCommentService.createComment(userId, postId, request);
        return ApiResponse.ok(response);
    }

    @PostMapping("/posts/{postId}/comments/{commentId}/replies")
    @Operation(summary = "대댓글 작성", description = "특정 댓글에 대댓글을 작성합니다.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "대댓글 작성 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "잘못된 요청 또는 게시글-댓글 소속 불일치",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "사용자, 게시글 또는 댓글을 찾을 수 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))
            )
    })
    public ApiResponse<CommentResponse> createReply(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
            @RequestParam Long userId,
            @Parameter(description = "대댓글을 작성할 게시글 ID입니다.", example = "10")
            @PathVariable Long postId,
            @Parameter(description = "부모 댓글 ID입니다.", example = "101")
            @PathVariable Long commentId,
            @Valid @RequestBody CommentCreateRequest request
    ) {
        CommentResponse response = communityCommentService.createReply(userId, postId, commentId, request);
        return ApiResponse.ok(response);
    }

    @GetMapping("/posts/{postId}/comments")
    @Operation(summary = "댓글 목록 조회", description = "특정 게시글의 댓글/대댓글 트리 목록을 조회합니다.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "댓글 목록 조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "게시글을 찾을 수 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))
            )
    })
    public ApiResponse<List<CommentResponse>> getComments(
            @Parameter(description = "댓글을 조회할 게시글 ID입니다.", example = "10")
            @PathVariable Long postId
    ) {
        List<CommentResponse> responses = communityCommentService.getComments(postId);
        return ApiResponse.ok(responses);
    }

    @DeleteMapping("/comments/{commentId}")
    @Operation(summary = "댓글 삭제", description = "댓글 작성자 본인만 삭제할 수 있습니다.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "댓글 삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "삭제 권한 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "댓글을 찾을 수 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))
            )
    })
    public ApiResponse<Void> deleteComment(
            @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "2")
            @RequestParam Long userId,
            @Parameter(description = "삭제할 댓글 ID입니다.", example = "101")
            @PathVariable Long commentId
    ) {
        communityCommentService.deleteComment(userId, commentId);
        return ApiResponse.ok();
    }
}

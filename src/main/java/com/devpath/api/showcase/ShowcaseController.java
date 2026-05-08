package com.devpath.api.showcase;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.showcase.dto.CreateShowcaseCommentRequest;
import com.devpath.api.showcase.dto.CreateShowcaseRequest;
import com.devpath.api.showcase.dto.ShowcaseCommentResponse;
import com.devpath.api.showcase.dto.ShowcaseLinkResponse;
import com.devpath.api.showcase.dto.ShowcaseResponse;
import com.devpath.api.showcase.dto.ShowcaseSummaryResponse;
import com.devpath.api.showcase.dto.UpdateShowcaseLinksRequest;
import com.devpath.api.showcase.dto.UpdateShowcaseRequest;
import com.devpath.api.showcase.service.ShowcaseService;
import com.devpath.api.showcase.service.ShowcaseSocialService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import com.devpath.domain.showcase.entity.ShowcaseCategory;
import com.devpath.domain.showcase.entity.ShowcaseSort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Showcase API", description = "쇼케이스 등록/수정/삭제/좋아요/댓글/조회수 API")
public class ShowcaseController {

  private final ShowcaseService showcaseService;
  private final ShowcaseSocialService showcaseSocialService;

  @PostMapping("/showcases")
  @Operation(summary = "쇼케이스 등록", description = "새 쇼케이스를 등록합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "등록 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ShowcaseResponse> createShowcase(
      @Valid @RequestBody CreateShowcaseRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(showcaseService.createShowcase(requireUserId(userId), request));
  }

  @GetMapping("/showcases")
  @Operation(summary = "쇼케이스 목록 조회", description = "카테고리/정렬 필터로 쇼케이스 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공")
  })
  public ApiResponse<List<ShowcaseSummaryResponse>> getShowcases(
      @Parameter(description = "카테고리 필터") @RequestParam(required = false) ShowcaseCategory category,
      @Parameter(description = "정렬 방식 (LATEST/POPULAR)")
          @RequestParam(required = false, defaultValue = "LATEST")
          ShowcaseSort sort) {
    return ApiResponse.ok(showcaseService.getShowcases(category, sort));
  }

  @GetMapping("/showcases/{showcaseId}")
  @Operation(summary = "쇼케이스 상세 조회", description = "쇼케이스 상세 정보를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "쇼케이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ShowcaseResponse> getShowcase(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId) {
    return ApiResponse.ok(showcaseService.getShowcase(showcaseId));
  }

  @PatchMapping("/showcases/{showcaseId}")
  @Operation(summary = "쇼케이스 수정", description = "쇼케이스 정보를 수정합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "수정 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "쇼케이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ShowcaseResponse> updateShowcase(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId,
      @Valid @RequestBody UpdateShowcaseRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        showcaseService.updateShowcase(showcaseId, requireUserId(userId), request));
  }

  @DeleteMapping("/showcases/{showcaseId}")
  @Operation(summary = "쇼케이스 삭제", description = "쇼케이스를 소프트 삭제합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "삭제 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "쇼케이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> deleteShowcase(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    showcaseService.deleteShowcase(showcaseId, requireUserId(userId));
    return ApiResponse.ok(null);
  }

  @PostMapping("/showcases/{showcaseId}/likes")
  @Operation(summary = "좋아요", description = "쇼케이스에 좋아요를 추가합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "좋아요 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "409",
        description = "이미 좋아요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> addLike(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    showcaseSocialService.addLike(showcaseId, requireUserId(userId));
    return ApiResponse.ok(null);
  }

  @DeleteMapping("/showcases/{showcaseId}/likes")
  @Operation(summary = "좋아요 취소", description = "쇼케이스 좋아요를 취소합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "취소 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "409",
        description = "좋아요 안 한 상태",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> removeLike(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    showcaseSocialService.removeLike(showcaseId, requireUserId(userId));
    return ApiResponse.ok(null);
  }

  @GetMapping("/showcases/{showcaseId}/likes/count")
  @Operation(summary = "좋아요 수 조회", description = "쇼케이스의 좋아요 수를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공")
  })
  public ApiResponse<Long> getLikeCount(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId) {
    return ApiResponse.ok(showcaseSocialService.getLikeCount(showcaseId));
  }

  @PostMapping("/showcases/{showcaseId}/comments")
  @Operation(summary = "댓글 작성", description = "쇼케이스에 댓글을 작성합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "작성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "쇼케이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ShowcaseCommentResponse> addComment(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId,
      @Valid @RequestBody CreateShowcaseCommentRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        showcaseSocialService.addComment(showcaseId, requireUserId(userId), request));
  }

  @GetMapping("/showcases/{showcaseId}/comments")
  @Operation(summary = "댓글 목록 조회", description = "쇼케이스의 댓글 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공")
  })
  public ApiResponse<List<ShowcaseCommentResponse>> getComments(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId) {
    return ApiResponse.ok(showcaseSocialService.getComments(showcaseId));
  }

  @DeleteMapping("/showcase-comments/{commentId}")
  @Operation(summary = "댓글 삭제", description = "댓글을 소프트 삭제합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "삭제 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "댓글 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> deleteComment(
      @Parameter(description = "댓글 ID", example = "1") @PathVariable Long commentId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    showcaseSocialService.deleteComment(commentId, requireUserId(userId));
    return ApiResponse.ok(null);
  }

  @PostMapping("/showcases/{showcaseId}/views")
  @Operation(summary = "조회수 증가", description = "쇼케이스 조회수를 1 증가시킵니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "증가 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "쇼케이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ShowcaseResponse> incrementView(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId) {
    return ApiResponse.ok(showcaseService.incrementView(showcaseId));
  }

  @GetMapping("/showcases/{showcaseId}/views/count")
  @Operation(summary = "조회수 조회", description = "쇼케이스의 조회수를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공")
  })
  public ApiResponse<Long> getViewCount(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId) {
    return ApiResponse.ok(showcaseService.getViewCount(showcaseId));
  }

  @PatchMapping("/showcases/{showcaseId}/links")
  @Operation(summary = "링크 수정", description = "쇼케이스의 외부 링크를 수정합니다. 기존 링크는 전체 교체됩니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "수정 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "쇼케이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<ShowcaseLinkResponse>> updateLinks(
      @Parameter(description = "쇼케이스 ID", example = "1") @PathVariable Long showcaseId,
      @RequestBody UpdateShowcaseLinksRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(showcaseService.updateLinks(showcaseId, requireUserId(userId), request));
  }
}

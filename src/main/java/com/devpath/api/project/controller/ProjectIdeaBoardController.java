package com.devpath.api.project.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.project.dto.ProjectAdvancedRequests.IdeaPostRequest;
import com.devpath.api.project.dto.ProjectAdvancedResponses.IdeaPostResponse;
import com.devpath.api.project.service.ProjectIdeaBoardService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/project-ideas")
@RequiredArgsConstructor
@Tag(name = "프로젝트 - 아이디어 게시판", description = "프로젝트 아이디어 게시판 API")
public class ProjectIdeaBoardController {

  private final ProjectIdeaBoardService projectIdeaBoardService;

  @PostMapping
  @Operation(summary = "아이디어 게시글 생성", description = "로그인한 사용자의 아이디어 게시글을 생성합니다.")
  public ApiResponse<IdeaPostResponse> createIdeaPost(
      @Valid @RequestBody IdeaPostRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long authorId) {
    return ApiResponse.ok(projectIdeaBoardService.createIdeaPost(request, requireUserId(authorId)));
  }

  @GetMapping
  @Operation(summary = "아이디어 게시글 목록 조회", description = "전체 아이디어 게시글을 조회합니다.")
  public ApiResponse<List<IdeaPostResponse>> getIdeaPostList() {
    return ApiResponse.ok(projectIdeaBoardService.getIdeaPostList());
  }

  @GetMapping("/{ideaId}")
  @Operation(summary = "아이디어 게시글 상세 조회", description = "아이디어 게시글을 ID 기준으로 조회합니다.")
  public ApiResponse<IdeaPostResponse> getIdeaPostDetail(@PathVariable Long ideaId) {
    return ApiResponse.ok(projectIdeaBoardService.getIdeaPostDetail(ideaId));
  }

  @PutMapping("/{ideaId}")
  @Operation(summary = "아이디어 게시글 수정", description = "로그인한 사용자가 작성한 아이디어 게시글을 수정합니다.")
  public ApiResponse<IdeaPostResponse> updateIdeaPost(
      @PathVariable Long ideaId,
      @Valid @RequestBody IdeaPostRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    return ApiResponse.ok(
        projectIdeaBoardService.updateIdeaPost(ideaId, request, requireUserId(requesterId)));
  }

  @DeleteMapping("/{ideaId}")
  @Operation(summary = "아이디어 게시글 삭제", description = "로그인한 사용자가 작성한 아이디어 게시글을 삭제합니다.")
  public ApiResponse<Void> deleteIdeaPost(
      @PathVariable Long ideaId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    projectIdeaBoardService.deleteIdeaPost(ideaId, requireUserId(requesterId));
    return ApiResponse.ok();
  }
}

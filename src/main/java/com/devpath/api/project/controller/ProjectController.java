package com.devpath.api.project.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.project.dto.CreateSoloProjectRequest;
import com.devpath.api.project.dto.ProjectRequest;
import com.devpath.api.project.dto.ProjectResponse;
import com.devpath.api.project.dto.UpdateProjectIntroRequest;
import com.devpath.api.project.dto.UpdateProjectVisibilityRequest;
import com.devpath.api.project.dto.UpdateRecruitingStatusRequest;
import com.devpath.api.project.service.ProjectService;
import com.devpath.common.response.ApiResponse;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Project API", description = "프로젝트 생성 및 관리 API")
public class ProjectController {

  private final ProjectService projectService;

  @PostMapping("/solo")
  @Operation(summary = "솔로 프로젝트 생성", description = "개인 솔로 프로젝트를 생성합니다. 생성자가 LEADER로 자동 등록됩니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "400",
        description = "잘못된 요청",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ProjectResponse> createSoloProject(
      @Valid @RequestBody CreateSoloProjectRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long creatorId) {
    return ApiResponse.ok(projectService.createSoloProject(request, requireUserId(creatorId)));
  }

  @PostMapping
  @Operation(summary = "스쿼드 프로젝트 생성", description = "팀 스쿼드 프로젝트를 생성합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ProjectResponse> createProject(
      @Valid @RequestBody ProjectRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long creatorId) {
    return ApiResponse.ok(projectService.createProject(request, requireUserId(creatorId)));
  }

  @GetMapping
  @Operation(summary = "프로젝트 목록 조회", description = "전체 프로젝트 목록을 최신순으로 조회합니다.")
  public ApiResponse<List<ProjectResponse>> getAllProjects() {
    return ApiResponse.ok(projectService.getAllProjects());
  }

  @GetMapping("/{projectId}")
  @Operation(summary = "프로젝트 상세 조회", description = "프로젝트 상세 정보와 멤버 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "프로젝트를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ProjectResponse> getProject(
      @Parameter(description = "프로젝트 ID", example = "1") @PathVariable Long projectId) {
    return ApiResponse.ok(projectService.getProject(projectId));
  }

  @PutMapping("/{projectId}")
  @Operation(summary = "프로젝트 수정", description = "프로젝트 멤버가 이름과 설명을 수정합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "수정 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "수정 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "프로젝트를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ProjectResponse> updateProject(
      @Parameter(description = "프로젝트 ID", example = "1") @PathVariable Long projectId,
      @Valid @RequestBody ProjectRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    return ApiResponse.ok(
        projectService.updateProject(projectId, requireUserId(requesterId), request));
  }

  @PatchMapping("/{projectId}/intro")
  @Operation(summary = "프로젝트 소개 수정", description = "프로젝트 오너만 상세 소개를 수정할 수 있습니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "수정 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "오너 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "프로젝트를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ProjectResponse> updateIntro(
      @Parameter(description = "프로젝트 ID", example = "1") @PathVariable Long projectId,
      @RequestBody UpdateProjectIntroRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    return ApiResponse.ok(
        projectService.updateIntro(projectId, requireUserId(requesterId), request));
  }

  @PatchMapping("/{projectId}/visibility")
  @Operation(summary = "프로젝트 공개 범위 변경", description = "프로젝트 오너만 PUBLIC/PRIVATE을 변경할 수 있습니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "변경 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "오너 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "프로젝트를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ProjectResponse> updateVisibility(
      @Parameter(description = "프로젝트 ID", example = "1") @PathVariable Long projectId,
      @Valid @RequestBody UpdateProjectVisibilityRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    return ApiResponse.ok(
        projectService.updateVisibility(projectId, requireUserId(requesterId), request));
  }

  @PatchMapping("/{projectId}/recruiting-status")
  @Operation(summary = "모집 상태 변경", description = "프로젝트 오너만 OPEN/CLOSED를 변경할 수 있습니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "변경 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "오너 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "프로젝트를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<ProjectResponse> updateRecruitingStatus(
      @Parameter(description = "프로젝트 ID", example = "1") @PathVariable Long projectId,
      @Valid @RequestBody UpdateRecruitingStatusRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    return ApiResponse.ok(
        projectService.updateRecruitingStatus(projectId, requireUserId(requesterId), request));
  }
}

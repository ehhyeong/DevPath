package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceResponse;
import com.devpath.api.workspace.service.WorkspaceService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import com.devpath.domain.workspace.entity.WorkspaceType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
@Tag(name = "Workspace List API", description = "내 워크스페이스 목록 조회 API")
public class WorkspaceListController {

  private final WorkspaceService workspaceService;

  @GetMapping("/me")
  @Operation(
      summary = "내 워크스페이스 목록 조회",
      description = "내가 속한 워크스페이스 목록을 조회합니다. type 파라미터로 필터링 가능합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<WorkspaceResponse>> getMyWorkspaces(
      @Parameter(description = "워크스페이스 타입 필터 (SOLO, SQUAD, MENTORING)")
          @RequestParam(required = false)
          WorkspaceType type,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceService.getMyWorkspaces(requireUserId(userId), type));
  }

  @GetMapping("/projects/me")
  @Operation(summary = "내 프로젝트 워크스페이스 목록 조회", description = "내가 속한 SOLO/SQUAD 타입 워크스페이스 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<WorkspaceResponse>> getMyProjectWorkspaces(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceService.getMyProjectWorkspaces(requireUserId(userId)));
  }

  @GetMapping("/solo/me")
  @Operation(summary = "내 솔로 워크스페이스 목록 조회", description = "내가 속한 SOLO 타입 워크스페이스 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<WorkspaceResponse>> getMySoloWorkspaces(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceService.getMySoloWorkspaces(requireUserId(userId)));
  }
}

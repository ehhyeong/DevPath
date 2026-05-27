package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.UpdateWorkspaceSettingsRequest;
import com.devpath.api.workspace.dto.WorkspaceSettingsResponse;
import com.devpath.api.workspace.service.WorkspaceService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/settings")
@RequiredArgsConstructor
@Tag(name = "Workspace Settings API", description = "스쿼드 워크스페이스 설정 API")
public class WorkspaceSettingsController {

  private final WorkspaceService workspaceService;

  @GetMapping
  @Operation(summary = "워크스페이스 설정 조회", description = "스쿼드 설정 화면에 필요한 기본 정보와 멤버 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "워크스페이스 멤버가 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "워크스페이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceSettingsResponse> getSettings(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceService.getWorkspaceSettings(workspaceId, requireUserId(userId)));
  }

  @PatchMapping
  @Operation(summary = "워크스페이스 설정 수정", description = "워크스페이스 소유자만 이름과 설명을 수정할 수 있습니다.")
  public ApiResponse<WorkspaceSettingsResponse> updateSettings(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody UpdateWorkspaceSettingsRequest request) {
    return ApiResponse.ok(
        workspaceService.updateWorkspaceSettings(workspaceId, requireUserId(userId), request));
  }

  @PatchMapping("/archive")
  @Operation(summary = "워크스페이스 보관", description = "워크스페이스 소유자만 스쿼드 워크스페이스를 보관할 수 있습니다.")
  public ApiResponse<WorkspaceSettingsResponse> archive(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceService.archiveWorkspace(workspaceId, requireUserId(userId)));
  }

  @PatchMapping("/restore")
  @Operation(summary = "워크스페이스 복원", description = "워크스페이스 소유자만 보관된 스쿼드 워크스페이스를 복원할 수 있습니다.")
  public ApiResponse<WorkspaceSettingsResponse> restore(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceService.restoreWorkspace(workspaceId, requireUserId(userId)));
  }

  @DeleteMapping
  @Operation(summary = "워크스페이스 삭제", description = "워크스페이스 소유자만 스쿼드 워크스페이스를 삭제할 수 있습니다.")
  public ApiResponse<Void> delete(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    workspaceService.deleteWorkspace(workspaceId, requireUserId(userId));
    return ApiResponse.ok();
  }
}

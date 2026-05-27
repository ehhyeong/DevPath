package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.ActivityLogResponse;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.api.workspace.dto.WorkspaceHubSummaryResponse;
import com.devpath.api.workspace.service.ActivityLogService;
import com.devpath.api.workspace.service.WorkspaceService;
import com.devpath.api.workspace.service.WorkspaceTaskService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Workspace Dashboard API", description = "워크스페이스 대시보드 및 허브 요약 API")
public class WorkspaceDashboardController {

  private final WorkspaceService workspaceService;
  private final WorkspaceTaskService workspaceTaskService;
  private final ActivityLogService activityLogService;

  @GetMapping("/workspaces/{workspaceId}/dashboard")
  @Operation(
      summary = "워크스페이스 대시보드 조회",
      description = "멤버 목록, 미해결 태스크 수, 마일스톤 현황 등 대시보드 데이터를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "워크스페이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceDashboardResponse> getWorkspaceDashboard(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceService.getWorkspaceDashboard(workspaceId, requireUserId(userId)));
  }

  @PostMapping("/workspaces/{workspaceId}/presence")
  @Operation(summary = "워크스페이스 접속 상태 갱신", description = "프로젝트 화면에 접속 중인 멤버의 마지막 활동 시각을 갱신합니다.")
  public ApiResponse<Void> touchWorkspacePresence(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    workspaceService.touchWorkspacePresence(workspaceId, requireUserId(userId));
    return ApiResponse.ok();
  }

  @GetMapping("/workspaces/hub/summary")
  @Operation(
      summary = "워크스페이스 허브 요약 조회",
      description = "내 전체 워크스페이스 수, 활성 워크스페이스 수 등 허브 요약 정보를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceHubSummaryResponse> getHubSummary(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceService.getHubSummary(requireUserId(userId)));
  }

  @GetMapping("/lounge/hub/summary")
  @Operation(summary = "라운지 허브 요약 조회", description = "라운지 화면에서 사용하는 워크스페이스 허브 요약 정보를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceHubSummaryResponse> getLoungeHubSummary(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceService.getHubSummary(requireUserId(userId)));
  }

  @GetMapping("/workspaces/{workspaceId}/activities/recent")
  @Operation(summary = "워크스페이스 최근 활동 조회", description = "워크스페이스의 최근 활동 로그 10건을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "워크스페이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<ActivityLogResponse>> getRecentActivities(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        activityLogService.getRecentActivityLogs(workspaceId, requireUserId(userId)));
  }
}

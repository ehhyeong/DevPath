package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.MentoringHeaderNotificationResponse;
import com.devpath.api.workspace.dto.TeamWorkspaceHeaderNotificationResponse;
import com.devpath.api.workspace.service.TeamWorkspaceHeaderNotificationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Team Workspace Header Notification API")
public class TeamWorkspaceHeaderNotificationController {

  private final TeamWorkspaceHeaderNotificationService notificationService;

  @GetMapping("/workspaces/{workspaceId}/team-header-notifications")
  @Operation(summary = "List team workspace header notifications")
  public ApiResponse<List<TeamWorkspaceHeaderNotificationResponse>> getNotifications(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "Team workspace page key", example = "kanban") @RequestParam
          String page,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        notificationService.getNotifications(workspaceId, page, requireUserId(userId)));
  }

  @GetMapping("/workspaces/{workspaceId}/mentoring-header-notifications")
  @Operation(summary = "List mentoring workspace header notifications")
  public ApiResponse<List<MentoringHeaderNotificationResponse>> getMentoringNotifications(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "Mentoring workspace page key", example = "dashboard") @RequestParam
          String page,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        notificationService.getMentoringNotifications(workspaceId, page, requireUserId(userId)));
  }
}

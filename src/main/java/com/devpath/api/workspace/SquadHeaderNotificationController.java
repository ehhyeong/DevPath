package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.CreateSquadHeaderNotificationRequest;
import com.devpath.api.workspace.dto.TeamWorkspaceHeaderNotificationResponse;
import com.devpath.api.workspace.service.TeamWorkspaceHeaderNotificationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SquadHeaderNotificationController {

  private final TeamWorkspaceHeaderNotificationService notificationService;

  @GetMapping("/workspaces/{workspaceId}/squad-header-notifications")
  @Operation(summary = "List squad header notifications")
  public ApiResponse<List<TeamWorkspaceHeaderNotificationResponse>> getNotifications(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(notificationService.getSquadNotifications(workspaceId, requireUserId(userId)));
  }

  @PostMapping("/workspaces/{workspaceId}/squad-header-notifications")
  @Operation(summary = "Create squad header notification")
  public ApiResponse<TeamWorkspaceHeaderNotificationResponse> createNotification(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Valid @RequestBody CreateSquadHeaderNotificationRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        notificationService.addSquadNotification(
            workspaceId,
            request.getPageKey(),
            request.getMessage(),
            request.getTargetPath(),
            requireUserId(userId)));
  }

  @DeleteMapping("/workspaces/{workspaceId}/squad-header-notifications")
  @Operation(summary = "Clear squad header notifications")
  public ApiResponse<Void> clearNotifications(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    notificationService.clearSquadNotifications(workspaceId, requireUserId(userId));
    return ApiResponse.ok(null);
  }
}

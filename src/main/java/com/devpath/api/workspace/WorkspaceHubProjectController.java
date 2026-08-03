package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteAcceptResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteLinkResponse;
import com.devpath.api.workspace.service.WorkspaceHubProjectService;
import com.devpath.common.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/hub")
@RequiredArgsConstructor
public class WorkspaceHubProjectController {

  private final WorkspaceHubProjectService workspaceHubProjectService;

  @GetMapping("/projects")
  public ApiResponse<List<WorkspaceHubProjectResponse>> getProjects(
      @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceHubProjectService.getProjects(userId));
  }

  @PostMapping("/projects/{workspaceId}/invite-link")
  public ApiResponse<WorkspaceInviteLinkResponse> createInviteLink(
      @PathVariable Long workspaceId, @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceHubProjectService.createInviteLink(workspaceId, requireUserId(userId)));
  }

  @PostMapping("/invites/{token}/accept")
  public ApiResponse<WorkspaceInviteAcceptResponse> acceptInvite(
      @PathVariable String token, @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceHubProjectService.acceptInvite(token, requireUserId(userId)));
  }

  @DeleteMapping("/projects/{workspaceId}/membership")
  public ApiResponse<Void> leaveProject(
      @PathVariable Long workspaceId, @AuthenticationPrincipal Long userId) {
    workspaceHubProjectService.leaveProject(workspaceId, requireUserId(userId));
    return ApiResponse.ok(null);
  }
}

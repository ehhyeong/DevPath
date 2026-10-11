package com.devpath.api.workspace.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceAiDesignJobResponse;
import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.api.workspace.dto.WorkspaceAiDesignWorkspaceResponse;
import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteAcceptResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteLinkResponse;
import com.devpath.api.workspace.service.WorkspaceAiDesignJobService;
import com.devpath.api.workspace.service.WorkspaceAiDesignService;
import com.devpath.api.workspace.service.WorkspaceAiDesignWorkspaceService;
import com.devpath.api.workspace.service.WorkspaceAiWorkspaceInitializationService;
import com.devpath.api.workspace.service.WorkspaceHubProjectService;
import com.devpath.common.response.ApiResponse;
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
@RequestMapping("/api/workspaces/hub")
@RequiredArgsConstructor
public class WorkspaceHubProjectController {

  private final WorkspaceHubProjectService workspaceHubProjectService;
  private final WorkspaceAiDesignService workspaceAiDesignService;
  private final WorkspaceAiDesignJobService workspaceAiDesignJobService;
  private final WorkspaceAiDesignWorkspaceService workspaceAiDesignWorkspaceService;
  private final WorkspaceAiWorkspaceInitializationService workspaceAiWorkspaceInitializationService;

  @PostMapping("/projects/{workspaceId}/ai-design/initialize")
  public ApiResponse<Void> initializeAiWorkspace(
      @AuthenticationPrincipal Long userId, @PathVariable Long workspaceId) {
    workspaceAiWorkspaceInitializationService.initialize(workspaceId, requireUserId(userId));
    return ApiResponse.ok(null);
  }

  @GetMapping("/projects")
  public ApiResponse<List<WorkspaceHubProjectResponse>> getProjects(
      @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceHubProjectService.getProjects(userId));
  }

  @PostMapping("/ai-design")
  public ApiResponse<WorkspaceAiDesignResponse> generateAiDesign(
      @AuthenticationPrincipal Long userId, @Valid @RequestBody WorkspaceAiDesignRequest request) {
    requireUserId(userId);
    return ApiResponse.ok(workspaceAiDesignService.generate(request));
  }

  @PostMapping("/ai-design-jobs")
  public ApiResponse<WorkspaceAiDesignJobResponse> createAiDesignJob(
      @AuthenticationPrincipal Long userId, @Valid @RequestBody WorkspaceAiDesignRequest request) {
    return ApiResponse.ok(workspaceAiDesignJobService.create(requireUserId(userId), request));
  }

  @GetMapping("/ai-design-jobs/{jobId}")
  public ApiResponse<WorkspaceAiDesignJobResponse> getAiDesignJob(
      @AuthenticationPrincipal Long userId, @PathVariable String jobId) {
    return ApiResponse.ok(workspaceAiDesignJobService.get(requireUserId(userId), jobId));
  }

  @PostMapping("/ai-design-jobs/{jobId}/workspace")
  public ApiResponse<WorkspaceAiDesignWorkspaceResponse> createAiWorkspace(
      @AuthenticationPrincipal Long userId, @PathVariable String jobId) {
    return ApiResponse.ok(workspaceAiDesignWorkspaceService.create(requireUserId(userId), jobId));
  }

  @GetMapping("/projects/{workspaceId}/ai-design")
  public ApiResponse<WorkspaceAiDesignWorkspaceResponse> getAiWorkspaceDesign(
      @AuthenticationPrincipal Long userId, @PathVariable Long workspaceId) {
    return ApiResponse.ok(
        workspaceAiDesignWorkspaceService.get(requireUserId(userId), workspaceId));
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

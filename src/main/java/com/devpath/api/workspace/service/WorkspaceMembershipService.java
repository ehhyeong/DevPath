package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteAcceptResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteLinkResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectRoleType;
import com.devpath.domain.project.entity.ProjectType;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.workspace.entity.ActivityLog;
import com.devpath.domain.workspace.entity.ActivityLogType;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.ActivityLogRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class WorkspaceMembershipService {

  private static final long INVITE_EXPIRE_DAYS = 14L;

  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceRepository workspaceRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final ActivityLogRepository activityLogRepository;
  private final WorkspaceInviteTokenCodec inviteTokenCodec;

  WorkspaceInviteLinkResponse createInviteLink(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspace(workspaceId);
    validateWorkspaceInviteSharer(workspace, userId);

    LocalDateTime expiresAt =
        LocalDateTime.now().plusDays(INVITE_EXPIRE_DAYS).truncatedTo(ChronoUnit.SECONDS);
    return new WorkspaceInviteLinkResponse(
        workspace.getId(), inviteTokenCodec.encode(workspace.getId(), expiresAt), expiresAt);
  }

  @Transactional
  WorkspaceInviteAcceptResponse acceptInvite(String token, Long userId) {
    WorkspaceInviteTokenCodec.Payload payload = inviteTokenCodec.decode(token);
    Workspace workspace = getWorkspace(payload.workspaceId());
    if (payload.expiresAt().isBefore(LocalDateTime.now())) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    boolean alreadyMember =
        workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspace.getId(), userId);
    if (!alreadyMember) {
      WorkspaceMember member =
          WorkspaceMember.builder().workspaceId(workspace.getId()).learnerId(userId).build();
      workspaceMemberRepository.save(member);
      activityLogRepository.save(
          ActivityLog.builder()
              .workspaceId(workspace.getId())
              .actorId(userId)
              .activityType(ActivityLogType.MEMBER_JOINED)
              .description("초대 링크로 새 멤버가 참여했습니다.")
              .build());
    }

    return new WorkspaceInviteAcceptResponse(
        workspace.getId(), WorkspaceHubProjectResponse.dashboardUrl(workspace), alreadyMember);
  }

  @Transactional
  void leaveProject(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspace(workspaceId);
    if (canDeleteWorkspace(workspace, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }

    WorkspaceMember member =
        workspaceMemberRepository
            .findByWorkspaceIdAndLearnerId(workspace.getId(), userId)
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_FORBIDDEN));

    workspaceMemberRepository.delete(member);
    activityLogRepository.save(
        ActivityLog.builder()
            .workspaceId(workspace.getId())
            .actorId(userId)
            .activityType(ActivityLogType.MEMBER_LEFT)
            .description("멤버가 워크스페이스에서 나갔습니다.")
            .build());
  }

  boolean canDeleteWorkspace(Workspace workspace, Long userId) {
    if (userId == null) {
      return false;
    }

    if (workspace.getType() != WorkspaceType.SQUAD) {
      return workspace.getOwnerId() != null && workspace.getOwnerId().equals(userId);
    }

    return findMatchingSquadProjects(workspace).stream()
        .anyMatch(project -> isProjectLeader(project.getId(), userId));
  }

  private List<Project> findMatchingSquadProjects(Workspace workspace) {
    if (workspace.getName() == null || workspace.getName().isBlank()) {
      return List.of();
    }
    return projectRepository.findAllByNameAndProjectTypeAndIsDeletedFalse(
        workspace.getName(), ProjectType.SQUAD);
  }

  private boolean isProjectLeader(Long projectId, Long userId) {
    return projectMemberRepository
        .findByProjectIdAndLearnerId(projectId, userId)
        .map(member -> member.getRoleType() == ProjectRoleType.LEADER)
        .orElse(false);
  }

  private Workspace getWorkspace(Long workspaceId) {
    return workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateWorkspaceInviteSharer(Workspace workspace, Long userId) {
    if (workspace.getOwnerId() != null && workspace.getOwnerId().equals(userId)) {
      return;
    }
    if (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspace.getId(), userId)) {
      return;
    }
    throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
  }
}

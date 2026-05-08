package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.api.workspace.dto.WorkspaceHubSummaryResponse;
import com.devpath.api.workspace.dto.WorkspaceResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceService {

  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final MilestoneRepository milestoneRepository;

  public List<WorkspaceResponse> getMyWorkspaces(Long userId, WorkspaceType type) {
    List<Long> workspaceIds = getWorkspaceIdsByMember(userId);
    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    List<Workspace> workspaces =
        (type == null)
            ? workspaceRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(workspaceIds)
            : workspaceRepository.findAllByIdInAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
                workspaceIds, type);

    return toResponsesWithMemberCount(workspaces);
  }

  public List<WorkspaceResponse> getMyProjectWorkspaces(Long userId) {
    List<Long> workspaceIds = getWorkspaceIdsByMember(userId);
    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    List<Workspace> workspaces =
        workspaceRepository.findAllByIdInAndTypeInAndIsDeletedFalseOrderByCreatedAtDesc(
            workspaceIds, List.of(WorkspaceType.SOLO, WorkspaceType.SQUAD));

    return toResponsesWithMemberCount(workspaces);
  }

  public List<WorkspaceResponse> getMySoloWorkspaces(Long userId) {
    List<Long> workspaceIds = getWorkspaceIdsByMember(userId);
    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    List<Workspace> workspaces =
        workspaceRepository.findAllByIdInAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            workspaceIds, WorkspaceType.SOLO);

    return toResponsesWithMemberCount(workspaces);
  }

  public WorkspaceDashboardResponse getWorkspaceDashboard(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspaceEntity(workspaceId);
    validateMember(workspaceId, userId);

    List<WorkspaceMember> members = workspaceMemberRepository.findAllByWorkspaceId(workspaceId);
    long unresolvedTaskCount =
        workspaceTaskRepository.countByWorkspaceIdAndStatusNotAndIsDeletedFalse(
            workspaceId, WorkspaceTaskStatus.DONE);
    long activeMilestoneCount =
        milestoneRepository.countByWorkspaceIdAndStatusInAndIsDeletedFalse(
            workspaceId, List.of(MilestoneStatus.OPEN, MilestoneStatus.IN_PROGRESS));
    return WorkspaceDashboardResponse.from(
        workspace, members, unresolvedTaskCount, activeMilestoneCount);
  }

  public WorkspaceHubSummaryResponse getHubSummary(Long userId) {
    List<Long> workspaceIds = getWorkspaceIdsByMember(userId);
    long total = workspaceIds.size();
    long active =
        workspaceIds.isEmpty() ? 0 : workspaceRepository.countByIdInAndIsDeletedFalse(workspaceIds);
    long unresolvedTasks =
        workspaceIds.isEmpty()
            ? 0
            : workspaceTaskRepository.countByWorkspaceIdInAndStatusNotAndIsDeletedFalse(
                workspaceIds, WorkspaceTaskStatus.DONE);
    long activeMilestones =
        workspaceIds.isEmpty()
            ? 0
            : milestoneRepository.countByWorkspaceIdInAndStatusInAndIsDeletedFalse(
                workspaceIds, List.of(MilestoneStatus.OPEN, MilestoneStatus.IN_PROGRESS));

    return WorkspaceHubSummaryResponse.builder()
        .totalWorkspaces(total)
        .activeWorkspaces(active)
        .totalUnresolvedTasks(unresolvedTasks)
        .totalActiveMilestones(activeMilestones)
        .build();
  }

  // --- 내부 헬퍼 ---

  private Workspace getWorkspaceEntity(Long workspaceId) {
    return workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateMember(Long workspaceId, Long userId) {
    if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }

  private List<Long> getWorkspaceIdsByMember(Long userId) {
    return workspaceMemberRepository.findAllByLearnerId(userId).stream()
        .map(WorkspaceMember::getWorkspaceId)
        .toList();
  }

  // N+1 방지: workspaceIds 일괄 조회 후 메모리 집계
  private List<WorkspaceResponse> toResponsesWithMemberCount(List<Workspace> workspaces) {
    if (workspaces.isEmpty()) {
      return List.of();
    }

    List<Long> ids = workspaces.stream().map(Workspace::getId).toList();
    Map<Long, Long> countByWorkspaceId =
        workspaceMemberRepository.findAllByWorkspaceIdIn(ids).stream()
            .collect(Collectors.groupingBy(WorkspaceMember::getWorkspaceId, Collectors.counting()));

    return workspaces.stream()
        .map(
            w ->
                WorkspaceResponse.from(
                    w, countByWorkspaceId.getOrDefault(w.getId(), 0L).intValue()))
        .toList();
  }
}

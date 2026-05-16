package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceHubProjectService {

  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceRepository workspaceRepository;

  public List<WorkspaceHubProjectResponse> getProjects(Long userId) {
    if (userId == null) {
      return List.of();
    }

    return getUserWorkspaceProjects(userId);
  }

  private List<WorkspaceHubProjectResponse> getUserWorkspaceProjects(Long userId) {
    List<Long> workspaceIds =
        workspaceMemberRepository.findAllByLearnerId(userId).stream()
            .map(WorkspaceMember::getWorkspaceId)
            .distinct()
            .toList();

    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    Map<Long, List<WorkspaceMember>> membersByWorkspaceId =
        workspaceMemberRepository.findAllByWorkspaceIdIn(workspaceIds).stream()
            .collect(Collectors.groupingBy(WorkspaceMember::getWorkspaceId));

    return workspaceRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(workspaceIds).stream()
        .map(workspace -> toResponse(workspace, membersByWorkspaceId, userId))
        .toList();
  }

  private WorkspaceHubProjectResponse toResponse(
      Workspace workspace, Map<Long, List<WorkspaceMember>> membersByWorkspaceId, Long userId) {
    return WorkspaceHubProjectResponse.fromWorkspace(
        workspace, membersByWorkspaceId.getOrDefault(workspace.getId(), List.of()), userId);
  }
}

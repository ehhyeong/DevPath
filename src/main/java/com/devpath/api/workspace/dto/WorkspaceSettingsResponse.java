package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkspaceSettingsResponse {

  private Long workspaceId;
  private String name;
  private String description;
  private WorkspaceType type;
  private WorkspaceStatus status;
  private Long ownerId;
  private boolean deleted;
  private boolean canManage;
  private int memberCount;
  private List<WorkspaceMemberResponse> members;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static WorkspaceSettingsResponse from(
      Workspace workspace, List<WorkspaceMemberResponse> members, Long viewerId) {
    return WorkspaceSettingsResponse.builder()
        .workspaceId(workspace.getId())
        .name(workspace.getName())
        .description(workspace.getDescription())
        .type(workspace.getType())
        .status(workspace.getStatus())
        .ownerId(workspace.getOwnerId())
        .deleted(workspace.isDeleted())
        .canManage(workspace.getOwnerId().equals(viewerId))
        .memberCount(members.size())
        .members(members)
        .createdAt(workspace.getCreatedAt())
        .updatedAt(workspace.getUpdatedAt())
        .build();
  }
}

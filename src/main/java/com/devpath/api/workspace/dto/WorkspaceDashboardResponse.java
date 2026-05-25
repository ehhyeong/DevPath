package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "워크스페이스 대시보드 응답 DTO")
public class WorkspaceDashboardResponse {

  @Schema(description = "워크스페이스 ID", example = "1")
  private Long workspaceId;

  @Schema(description = "워크스페이스 이름", example = "DevPath 팀 워크스페이스")
  private String name;

  @Schema(description = "워크스페이스 설명")
  private String description;

  @Schema(description = "워크스페이스 타입", example = "SQUAD")
  private WorkspaceType type;

  @Schema(description = "워크스페이스 상태", example = "ACTIVE")
  private WorkspaceStatus status;

  @Schema(description = "오너 ID", example = "1")
  private Long ownerId;

  @Schema(description = "오너 표시 이름")
  private String ownerName;

  @Schema(description = "오너 프로필 이미지 URL")
  private String ownerProfileImage;

  @Schema(description = "오너 소개")
  private String ownerBio;

  @Schema(description = "멤버 목록")
  private List<WorkspaceMemberResponse> members;

  @Schema(description = "미해결 태스크 수", example = "3")
  private long unresolvedTaskCount;

  @Schema(description = "진행 중 마일스톤 수", example = "2")
  private long activeMilestoneCount;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  public static WorkspaceDashboardResponse from(
      Workspace workspace,
      List<WorkspaceMember> members,
      long unresolvedTaskCount,
      long activeMilestoneCount) {
    return fromMemberResponses(
        workspace,
        members.stream().map(WorkspaceMemberResponse::from).toList(),
        unresolvedTaskCount,
        activeMilestoneCount);
  }

  public static WorkspaceDashboardResponse fromMemberResponses(
      Workspace workspace,
      List<WorkspaceMemberResponse> members,
      long unresolvedTaskCount,
      long activeMilestoneCount) {
    return fromMemberResponses(
        workspace, members, unresolvedTaskCount, activeMilestoneCount, null, null, null);
  }

  public static WorkspaceDashboardResponse fromMemberResponses(
      Workspace workspace,
      List<WorkspaceMemberResponse> members,
      long unresolvedTaskCount,
      long activeMilestoneCount,
      String ownerName,
      String ownerProfileImage,
      String ownerBio) {
    return builder()
        .workspaceId(workspace.getId())
        .name(workspace.getName())
        .description(workspace.getDescription())
        .type(workspace.getType())
        .status(workspace.getStatus())
        .ownerId(workspace.getOwnerId())
        .ownerName(ownerName)
        .ownerProfileImage(ownerProfileImage)
        .ownerBio(ownerBio)
        .members(members)
        .unresolvedTaskCount(unresolvedTaskCount)
        .activeMilestoneCount(activeMilestoneCount)
        .createdAt(workspace.getCreatedAt())
        .build();
  }
}

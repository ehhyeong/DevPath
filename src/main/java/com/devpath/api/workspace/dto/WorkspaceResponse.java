package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "워크스페이스 목록 응답 DTO")
public class WorkspaceResponse {

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

  @Schema(description = "멤버 수", example = "3")
  private int memberCount;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  public static WorkspaceResponse from(Workspace workspace, int memberCount) {
    return builder()
        .workspaceId(workspace.getId())
        .name(workspace.getName())
        .description(workspace.getDescription())
        .type(workspace.getType())
        .status(workspace.getStatus())
        .ownerId(workspace.getOwnerId())
        .memberCount(memberCount)
        .createdAt(workspace.getCreatedAt())
        .build();
  }
}

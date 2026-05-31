package com.devpath.api.project.dto;

import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectMember;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectResponse {

  private Long projectId;
  private Long ownerId;
  private String name;
  private String description;
  private String intro;
  private String projectType;
  private String status;
  private String visibility;
  private String recruitingStatus;
  private Long workspaceId;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private List<ProjectMemberResponse> members;

  // 상세 조회 (멤버 포함)
  public static ProjectResponse from(Project project, List<ProjectMember> members) {
    return from(project, members, null);
  }

  public static ProjectResponse from(
      Project project, List<ProjectMember> members, Long workspaceId) {
    return ProjectResponse.builder()
        .projectId(project.getId())
        .ownerId(project.getOwnerId())
        .name(project.getName())
        .description(project.getDescription())
        .intro(project.getIntro())
        .projectType(project.getProjectType().name())
        .status(project.getStatus().name())
        .visibility(project.getVisibility().name())
        .recruitingStatus(project.getRecruitingStatus().name())
        .workspaceId(workspaceId)
        .createdAt(project.getCreatedAt())
        .updatedAt(project.getUpdatedAt())
        .members(members.stream().map(ProjectMemberResponse::from).toList())
        .build();
  }

  // 목록 조회 (멤버 제외)
  public static ProjectResponse from(Project project) {
    return from(project, Collections.emptyList());
  }
}

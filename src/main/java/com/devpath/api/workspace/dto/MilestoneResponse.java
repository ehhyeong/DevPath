package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class MilestoneResponse {

  private Long milestoneId;
  private Long workspaceId;
  private String title;
  private String description;
  private LocalDate startDate;
  private LocalDate dueDate;
  private MilestoneStatus status;
  private Long createdById;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static MilestoneResponse from(Milestone milestone) {
    return MilestoneResponse.builder()
        .milestoneId(milestone.getId())
        .workspaceId(milestone.getWorkspaceId())
        .title(milestone.getTitle())
        .description(milestone.getDescription())
        .startDate(milestone.getStartDate())
        .dueDate(milestone.getDueDate())
        .status(milestone.getStatus())
        .createdById(milestone.getCreatedById())
        .createdAt(milestone.getCreatedAt())
        .updatedAt(milestone.getUpdatedAt())
        .build();
  }
}

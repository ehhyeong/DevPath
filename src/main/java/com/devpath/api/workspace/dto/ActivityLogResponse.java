package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.ActivityLog;
import com.devpath.domain.workspace.entity.ActivityLogType;
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
public class ActivityLogResponse {

  private Long logId;
  private Long workspaceId;
  private Long actorId;
  private ActivityLogType activityType;
  private String description;
  private LocalDateTime createdAt;

  public static ActivityLogResponse from(ActivityLog log) {
    return ActivityLogResponse.builder()
        .logId(log.getId())
        .workspaceId(log.getWorkspaceId())
        .actorId(log.getActorId())
        .activityType(log.getActivityType())
        .description(log.getDescription())
        .createdAt(log.getCreatedAt())
        .build();
  }
}

package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.TeamWorkspaceHeaderNotification;
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
public class TeamWorkspaceHeaderNotificationResponse {

  private Long id;
  private Long workspaceId;
  private String pageKey;
  private String message;
  private String timeLabel;
  private String targetPath;
  private LocalDateTime createdAt;

  public static TeamWorkspaceHeaderNotificationResponse from(
      TeamWorkspaceHeaderNotification notification) {
    return TeamWorkspaceHeaderNotificationResponse.builder()
        .id(notification.getId())
        .workspaceId(notification.getWorkspaceId())
        .pageKey(notification.getPageKey())
        .message(notification.getMessage())
        .timeLabel(notification.getTimeLabel())
        .targetPath(notification.getTargetPath())
        .createdAt(notification.getCreatedAt())
        .build();
  }
}

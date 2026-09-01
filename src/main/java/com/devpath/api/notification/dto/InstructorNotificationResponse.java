package com.devpath.api.notification.dto;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class InstructorNotificationResponse {

  private Long notificationId;
  private String type;
  private String message;
  private Boolean isRead;
  private LocalDateTime createdAt;
}

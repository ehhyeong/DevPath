package com.devpath.api.instructor.dto.notification;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {

  private Long notificationId;
  private String type;
  private String message;
  private Boolean isRead;
  private LocalDateTime createdAt;
}

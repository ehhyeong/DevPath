package com.devpath.api.instructor.dto.notification;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationResponse {

    private Long notificationId;
    private String type;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
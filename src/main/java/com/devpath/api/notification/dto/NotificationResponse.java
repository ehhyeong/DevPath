package com.devpath.api.notification.dto;

import com.devpath.domain.notification.entity.LearnerNotification;
import com.devpath.domain.notification.entity.LearnerNotificationType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "학습자 알림 응답 DTO")
public class NotificationResponse {

  @Schema(description = "알림 ID", example = "1")
  private Long id;

  @Schema(description = "알림 타입", example = "SYSTEM")
  private LearnerNotificationType type;

  @Schema(description = "알림 메시지 내용", example = "PR 리뷰가 등록되었습니다.")
  private String message;

  @Schema(description = "읽음 여부", example = "false")
  private Boolean isRead;

  @Schema(description = "알림 생성 일시")
  private LocalDateTime createdAt;

  public static NotificationResponse from(LearnerNotification notification) {
    return NotificationResponse.builder()
        .id(notification.getId())
        .type(notification.getType())
        .message(notification.getMessage())
        .isRead(notification.getIsRead())
        .createdAt(notification.getCreatedAt())
        .build();
  }
}

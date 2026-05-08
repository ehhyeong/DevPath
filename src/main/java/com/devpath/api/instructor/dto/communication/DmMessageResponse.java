package com.devpath.api.instructor.dto.communication;

import com.devpath.api.instructor.entity.DmMessage;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DmMessageResponse {

  private Long messageId;
  private Long senderId;
  private String message;
  private LocalDateTime createdAt;

  public static DmMessageResponse from(DmMessage dmMessage) {
    return DmMessageResponse.builder()
        .messageId(dmMessage.getId())
        .senderId(dmMessage.getSenderId())
        .message(dmMessage.getMessage())
        .createdAt(dmMessage.getCreatedAt())
        .build();
  }
}

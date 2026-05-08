package com.devpath.api.application.dto;

import com.devpath.domain.application.entity.ApplicationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class ApplicationMessageResponse {

  private ApplicationMessageResponse() {}

  @Schema(name = "ApplicationMessageDetailResponse", description = "라운지 신청 메시지 응답")
  public record Detail(
      @Schema(description = "메시지 ID", example = "1") Long messageId,
      @Schema(description = "라운지 신청 ID", example = "1") Long applicationId,
      @Schema(description = "작성자 ID", example = "2") Long senderId,
      @Schema(description = "작성자 이름", example = "이학습") String senderName,
      @Schema(description = "현재 조회자 본인이 작성한 메시지 여부", example = "true") Boolean isMine,
      @Schema(description = "메시지 내용", example = "지원서 확인 부탁드립니다.") String content,
      @Schema(description = "작성일시", example = "2026-05-03T16:00:00") LocalDateTime createdAt) {

    // viewerId 기준으로 내가 보낸 메시지인지 계산해서 응답한다.
    public static Detail from(ApplicationMessage message, Long viewerId) {
      return new Detail(
          message.getId(),
          message.getApplication().getId(),
          message.getSender().getId(),
          message.getSender().getName(),
          message.getSender().getId().equals(viewerId),
          message.getContent(),
          message.getCreatedAt());
    }
  }
}

package com.devpath.api.realtime.dto;

import com.devpath.domain.realtime.entity.DirectMessage;
import com.devpath.domain.realtime.entity.LoungeChatMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class RealtimeMessageResponse {

  private RealtimeMessageResponse() {}

  @Schema(name = "LoungeChatMessageResponse", description = "라운지 채팅 메시지 응답")
  public record LoungeChatDetail(
      @Schema(description = "라운지 채팅 메시지 ID", example = "1") Long messageId,
      @Schema(description = "라운지 ID", example = "1") Long loungeId,
      @Schema(description = "발신자 ID", example = "2") Long senderId,
      @Schema(description = "발신자 이름", example = "이학습") String senderName,
      @Schema(description = "현재 조회자가 보낸 메시지 여부", example = "true") Boolean isMine,
      @Schema(description = "메시지 내용", example = "오늘 멘토링 회의 몇 시에 시작하나요?") String content,
      @Schema(description = "작성일시", example = "2026-05-03T18:00:00") LocalDateTime createdAt) {
    // viewerId 기준으로 내가 보낸 메시지인지 계산해서 응답한다.
    public static LoungeChatDetail from(LoungeChatMessage message, Long viewerId) {
      return new LoungeChatDetail(
          message.getId(),
          message.getLoungeId(),
          message.getSender().getId(),
          message.getSender().getName(),
          message.getSender().getId().equals(viewerId),
          message.getContent(),
          message.getCreatedAt());
    }
  }

  @Schema(name = "DirectMessageResponse", description = "1:1 메시지 응답")
  public record DirectDetail(
      @Schema(description = "1:1 메시지 ID", example = "1") Long messageId,
      @Schema(description = "발신자 ID", example = "2") Long senderId,
      @Schema(description = "발신자 이름", example = "이학습") String senderName,
      @Schema(description = "수신자 ID", example = "1") Long receiverId,
      @Schema(description = "수신자 이름", example = "김멘토") String receiverName,
      @Schema(description = "현재 조회자가 보낸 메시지 여부", example = "true") Boolean isMine,
      @Schema(description = "메시지 내용", example = "PR 리뷰 확인 부탁드립니다.") String content,
      @Schema(description = "작성일시", example = "2026-05-03T18:10:00") LocalDateTime createdAt) {
    // viewerId 기준으로 내가 보낸 메시지인지 계산해서 응답한다.
    public static DirectDetail from(DirectMessage message, Long viewerId) {
      return new DirectDetail(
          message.getId(),
          message.getSender().getId(),
          message.getSender().getName(),
          message.getReceiver().getId(),
          message.getReceiver().getName(),
          message.getSender().getId().equals(viewerId),
          message.getContent(),
          message.getCreatedAt());
    }
  }
}

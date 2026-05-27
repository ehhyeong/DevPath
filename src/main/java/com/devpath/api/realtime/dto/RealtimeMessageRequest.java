package com.devpath.api.realtime.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class RealtimeMessageRequest {

  private RealtimeMessageRequest() {}

  @Schema(name = "LoungeChatMessageCreateRequest", description = "라운지 채팅 메시지 작성 요청")
  public record LoungeChatCreate(

      // A 담당 라운지/워크스페이스 Entity와 직접 연결하지 않고 ID만 받는다.
      @Schema(description = "라운지 ID", example = "1") @NotNull(message = "라운지 ID는 필수입니다.")
          Long loungeId,
      @Schema(hidden = true) Long senderId,

      // 라운지 채팅 메시지 본문이다.
      @Schema(description = "메시지 내용", example = "오늘 멘토링 회의 몇 시에 시작하나요?")
          @NotBlank(message = "메시지 내용은 필수입니다.")
          @Size(max = 2000, message = "메시지 내용은 2000자 이하여야 합니다.")
          String content) {}

  @Schema(name = "DirectMessageCreateRequest", description = "1:1 메시지 전송 요청")
  public record DirectCreate(
      @Schema(hidden = true) Long senderId,

      // 1:1 메시지를 받을 사용자 ID다.
      @Schema(description = "메시지 수신자 ID", example = "1") @NotNull(message = "메시지 수신자 ID는 필수입니다.")
          Long receiverId,

      // 1:1 메시지 본문이다.
      @Schema(description = "메시지 내용", example = "PR 리뷰 확인 부탁드립니다.")
          @NotBlank(message = "메시지 내용은 필수입니다.")
          @Size(max = 2000, message = "메시지 내용은 2000자 이하여야 합니다.")
          String content) {}
}

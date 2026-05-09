package com.devpath.api.voice.dto;

import com.devpath.domain.voice.entity.VoiceEventType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class VoiceRequest {

  private VoiceRequest() {}

  @Schema(name = "VoiceChannelCreateRequest", description = "보이스 채널 생성 요청")
  public record ChannelCreate(

      // A 담당 워크스페이스 Entity와 직접 연결하지 않고 ID만 받는다.
      @Schema(description = "워크스페이스 ID", example = "1") @NotNull(message = "워크스페이스 ID는 필수입니다.")
          Long workspaceId,

      @Schema(hidden = true) Long creatorId,

      // 보이스 채널 이름이다.
      @Schema(description = "보이스 채널 이름", example = "백엔드 회의실")
          @NotBlank(message = "보이스 채널 이름은 필수입니다.")
          @Size(max = 150, message = "보이스 채널 이름은 150자 이하여야 합니다.")
          String name,

      // 보이스 채널 설명이다.
      @Schema(description = "보이스 채널 설명", example = "백엔드 작업 중 빠르게 논의하는 음성 채널입니다.")
          @Size(max = 500, message = "보이스 채널 설명은 500자 이하여야 합니다.")
          String description) {}

  @Schema(name = "VoiceChannelJoinRequest", description = "보이스 채널 참여 요청")
  public record Join(

      @Schema(hidden = true) Long userId) {}

  @Schema(name = "VoiceChannelLeaveRequest", description = "보이스 채널 퇴장 요청")
  public record Leave(

      @Schema(hidden = true) Long userId) {}

  @Schema(name = "VoiceEventCreateRequest", description = "보이스 채널 상태 이벤트 저장 요청")
  public record EventCreate(

      @Schema(hidden = true) Long actorId,

      // 음소거, 손들기, 발언 상태 이벤트 타입이다.
      @Schema(description = "이벤트 타입", example = "MUTE") @NotNull(message = "이벤트 타입은 필수입니다.")
          VoiceEventType type,

      // 이벤트와 함께 저장할 선택 메모다.
      @Schema(description = "이벤트 메모", example = "마이크 잡음 때문에 음소거했습니다.")
          @Size(max = 500, message = "이벤트 메모는 500자 이하여야 합니다.")
          String memo) {}
}

package com.devpath.api.voice.dto;

import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.entity.VoiceEvent;
import com.devpath.domain.voice.entity.VoiceEventType;
import com.devpath.domain.voice.entity.VoiceParticipant;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class VoiceResponse {

  private VoiceResponse() {}

  @Schema(name = "VoiceChannelSummaryResponse", description = "보이스 채널 목록 응답")
  public record ChannelSummary(
      @Schema(description = "보이스 채널 ID", example = "1") Long channelId,
      @Schema(description = "워크스페이스 ID", example = "1") Long workspaceId,
      @Schema(description = "채널 생성자 ID", example = "1") Long creatorId,
      @Schema(description = "채널 생성자 이름", example = "김리더") String creatorName,
      @Schema(description = "보이스 채널 이름", example = "백엔드 회의실") String name,
      @Schema(description = "보이스 채널 설명", example = "백엔드 작업 중 빠르게 논의하는 음성 채널입니다.")
          String description,
      @Schema(description = "현재 참가자 수", example = "3") Long activeParticipantCount,
      @Schema(description = "생성일시", example = "2026-05-03T19:00:00") LocalDateTime createdAt) {
    // 채널 목록 화면에 필요한 요약 정보를 DTO로 변환한다.
    public static ChannelSummary from(VoiceChannel channel, Long activeParticipantCount) {
      return new ChannelSummary(
          channel.getId(),
          channel.getWorkspaceId(),
          channel.getCreator().getId(),
          channel.getCreator().getName(),
          channel.getName(),
          channel.getDescription(),
          activeParticipantCount,
          channel.getCreatedAt());
    }
  }

  @Schema(name = "VoiceChannelDetailResponse", description = "보이스 채널 상세 응답")
  public record ChannelDetail(
      @Schema(description = "보이스 채널 ID", example = "1") Long channelId,
      @Schema(description = "워크스페이스 ID", example = "1") Long workspaceId,
      @Schema(description = "채널 생성자 ID", example = "1") Long creatorId,
      @Schema(description = "채널 생성자 이름", example = "김리더") String creatorName,
      @Schema(description = "보이스 채널 이름", example = "백엔드 회의실") String name,
      @Schema(description = "보이스 채널 설명", example = "백엔드 작업 중 빠르게 논의하는 음성 채널입니다.")
          String description,
      @Schema(description = "생성일시", example = "2026-05-03T19:00:00") LocalDateTime createdAt) {
    // 채널 생성 응답에 필요한 상세 정보를 DTO로 변환한다.
    public static ChannelDetail from(VoiceChannel channel) {
      return new ChannelDetail(
          channel.getId(),
          channel.getWorkspaceId(),
          channel.getCreator().getId(),
          channel.getCreator().getName(),
          channel.getName(),
          channel.getDescription(),
          channel.getCreatedAt());
    }
  }

  @Schema(name = "VoiceParticipantResponse", description = "보이스 채널 참가자 응답")
  public record ParticipantDetail(
      @Schema(description = "참가자 ID", example = "1") Long participantId,
      @Schema(description = "보이스 채널 ID", example = "1") Long channelId,
      @Schema(description = "사용자 ID", example = "2") Long userId,
      @Schema(description = "사용자 이름", example = "이학습") String userName,
      @Schema(description = "현재 접속 여부", example = "true") Boolean active,
      @Schema(description = "음소거 여부", example = "true") Boolean muted,
      @Schema(description = "손들기 여부", example = "false") Boolean handRaised,
      @Schema(description = "발언 중 여부", example = "false") Boolean speaking,
      @Schema(description = "참여일시", example = "2026-05-03T19:01:00") LocalDateTime joinedAt,
      @Schema(description = "퇴장일시", example = "2026-05-03T19:30:00") LocalDateTime leftAt) {
    // 참가자 Entity를 응답 DTO로 변환한다.
    public static ParticipantDetail from(VoiceParticipant participant) {
      return new ParticipantDetail(
          participant.getId(),
          participant.getChannel().getId(),
          participant.getUser().getId(),
          participant.getUser().getName(),
          participant.getActive(),
          participant.getMuted(),
          participant.getHandRaised(),
          participant.getSpeaking(),
          participant.getJoinedAt(),
          participant.getLeftAt());
    }
  }

  @Schema(name = "VoiceEventResponse", description = "보이스 채널 상태 이벤트 응답")
  public record EventDetail(
      @Schema(description = "이벤트 ID", example = "1") Long eventId,
      @Schema(description = "보이스 채널 ID", example = "1") Long channelId,
      @Schema(description = "이벤트 사용자 ID", example = "2") Long actorId,
      @Schema(description = "이벤트 사용자 이름", example = "이학습") String actorName,
      @Schema(description = "이벤트 타입", example = "MUTE") VoiceEventType type,
      @Schema(description = "이벤트 메모", example = "마이크 잡음 때문에 음소거했습니다.") String memo,
      @Schema(description = "이벤트 발생일시", example = "2026-05-03T19:05:00") LocalDateTime createdAt) {
    // 이벤트 Entity를 응답 DTO로 변환한다.
    public static EventDetail from(VoiceEvent event) {
      return new EventDetail(
          event.getId(),
          event.getChannel().getId(),
          event.getActor().getId(),
          event.getActor().getName(),
          event.getType(),
          event.getMemo(),
          event.getCreatedAt());
    }
  }
}

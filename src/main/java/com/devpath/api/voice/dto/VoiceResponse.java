package com.devpath.api.voice.dto;

import com.devpath.api.workspace.dto.WorkspaceTaskResponse;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.entity.VoiceChatClearState;
import com.devpath.domain.voice.entity.VoiceChatMessage;
import com.devpath.domain.voice.entity.VoiceEvent;
import com.devpath.domain.voice.entity.VoiceEventType;
import com.devpath.domain.voice.entity.VoiceLobbyPresence;
import com.devpath.domain.voice.entity.VoiceMeetingMinutes;
import com.devpath.domain.voice.entity.VoiceParticipant;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
      @Schema(description = "현재 회의 세션 시작일시", example = "2026-05-03T19:01:00")
          LocalDateTime currentSessionStartedAt,
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
          channel.getCurrentSessionStartedAt(),
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
      @Schema(description = "현재 회의 세션 시작일시", example = "2026-05-03T19:01:00")
          LocalDateTime currentSessionStartedAt,
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
          channel.getCurrentSessionStartedAt(),
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
      @Schema(description = "현재 회의 세션 시작일시", example = "2026-05-03T19:01:00")
          LocalDateTime currentSessionStartedAt,
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
          participant.getChannel().getCurrentSessionStartedAt(),
          participant.getJoinedAt(),
          participant.getLeftAt());
    }
  }

  @Schema(name = "VoiceLobbyPresenceResponse", description = "음성 회의 대기실 접속 상태 응답")
  public record PresenceDetail(
      @Schema(description = "보이스 채널 ID", example = "1") Long channelId,
      @Schema(description = "사용자 ID", example = "2") Long userId,
      @Schema(description = "사용자 이름", example = "홍길동") String userName,
      @Schema(description = "마지막 접속 확인 시간", example = "2026-05-18T19:01:00")
          LocalDateTime lastSeenAt) {
    public static PresenceDetail from(VoiceLobbyPresence presence) {
      return new PresenceDetail(
          presence.getChannel().getId(),
          presence.getUser().getId(),
          presence.getUser().getName(),
          presence.getLastSeenAt());
    }
  }

  @Schema(name = "VoiceChatMessageResponse", description = "Voice meeting chat message response")
  public record ChatMessageDetail(
      @Schema(description = "Message ID", example = "1") Long messageId,
      @Schema(description = "Voice channel ID", example = "1") Long channelId,
      @Schema(description = "Sender ID", example = "2") Long senderId,
      @Schema(description = "Sender name", example = "김하늘") String senderName,
      @Schema(description = "Message content", example = "회의 내용 정리해둘게요.") String content,
      @Schema(description = "Created datetime", example = "2026-05-18T19:05:00")
          LocalDateTime createdAt) {
    public static ChatMessageDetail from(VoiceChatMessage message) {
      return new ChatMessageDetail(
          message.getId(),
          message.getChannel().getId(),
          message.getSender().getId(),
          message.getSender().getName(),
          message.getContent(),
          message.getCreatedAt());
    }
  }

  @Schema(
      name = "VoiceChatClearStateResponse",
      description = "Voice meeting personal chat clear state response")
  public record ChatClearStateDetail(
      @Schema(description = "Voice channel ID", example = "1") Long channelId,
      @Schema(description = "User ID", example = "2") Long userId,
      @Schema(description = "Messages created at or before this time are hidden for the user")
          LocalDateTime clearedAt) {
    public static ChatClearStateDetail from(VoiceChatClearState state) {
      return new ChatClearStateDetail(
          state.getChannel().getId(), state.getUser().getId(), state.getClearedAt());
    }
  }

  @Schema(name = "VoiceMeetingMinutesResponse", description = "Voice meeting minutes response")
  public record MinutesDetail(
      @Schema(description = "Voice channel ID", example = "1") Long channelId,
      @Schema(description = "Recording state", example = "false") Boolean recording,
      @Schema(description = "Meeting transcript or memo") String transcript,
      @Schema(description = "Meeting summary") String summary,
      @Schema(description = "Last updater ID", example = "2") Long updatedByUserId,
      @Schema(description = "Last updater name", example = "김하늘") String updatedByUserName,
      @Schema(description = "Updated datetime", example = "2026-05-18T19:05:00")
          LocalDateTime updatedAt) {
    public static MinutesDetail from(VoiceMeetingMinutes minutes) {
      return new MinutesDetail(
          minutes.getChannel().getId(),
          minutes.getRecording(),
          minutes.getTranscript(),
          minutes.getSummary(),
          minutes.getUpdatedBy().getId(),
          minutes.getUpdatedBy().getName(),
          minutes.getUpdatedAt());
    }

    public static MinutesDetail empty(VoiceChannel channel) {
      return new MinutesDetail(channel.getId(), false, "", "", null, null, null);
    }
  }

  @Schema(
      name = "VoiceMeetingMinutesAnalysisResponse",
      description = "AI minutes summary and extracted action items")
  public record MinutesAnalysisDetail(
      @Schema(description = "Saved meeting minutes") MinutesDetail minutes,
      @Schema(description = "Action items extracted by AI") List<MinutesActionItem> actionItems) {}

  @Schema(
      name = "VoiceMeetingMinutesActionItemResponse",
      description = "Action item extracted from AI minutes")
  public record MinutesActionItem(
      @Schema(description = "Task title", example = "결제 UI 최종 시안 에셋 정리 및 공유") String title,
      @Schema(description = "Task description") String description,
      @Schema(description = "Task priority", example = "MEDIUM") WorkspaceTaskPriority priority,
      @Schema(description = "Assignee name mentioned in the meeting", example = "박디자인")
          String assigneeName,
      @Schema(description = "Due date mentioned in the meeting", example = "2026-06-01")
          LocalDate dueDate) {}

  @Schema(
      name = "VoiceMeetingMinutesKanbanTasksResponse",
      description = "Kanban tasks created from AI minutes")
  public record MinutesKanbanTasksDetail(
      @Schema(description = "Created Kanban tasks") List<WorkspaceTaskResponse> tasks) {}

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

package com.devpath.api.voice.dto;

import com.devpath.domain.voice.entity.VoiceEventType;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

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
  public record Join(@Schema(hidden = true) Long userId) {}

  @Schema(name = "VoiceChannelLeaveRequest", description = "보이스 채널 퇴장 요청")
  public record Leave(@Schema(hidden = true) Long userId) {}

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

  @Schema(
      name = "VoiceChatMessageCreateRequest",
      description = "Voice meeting chat message create request")
  public record ChatMessageCreate(
      @Schema(description = "Message content", example = "오늘 회의 내용 정리해둘게요.")
          @NotBlank(message = "메시지를 입력해 주세요.")
          @Size(max = 2000, message = "메시지는 2000자 이하여야 합니다.")
          String content) {}

  @Schema(
      name = "VoiceMeetingMinutesUpdateRequest",
      description = "Voice meeting minutes update request")
  public record MinutesUpdate(
      @Schema(description = "Recording state", example = "true") Boolean recording,
      @Schema(description = "Meeting transcript or memo")
          @Size(max = 20000, message = "회의록은 20000자 이하여야 합니다.")
          String transcript,
      @Schema(description = "Meeting summary") @Size(max = 10000, message = "요약은 10000자 이하여야 합니다.")
          String summary) {}

  @Schema(
      name = "VoiceMeetingMinutesTranscriptAppendRequest",
      description = "Append one transcript line")
  public record MinutesTranscriptAppend(
      @Schema(description = "Final speech-recognition text")
          @NotBlank(message = "음성 기록 내용을 입력해 주세요.")
          @Size(max = 1000, message = "음성 기록 내용은 1000자 이하여야 합니다.")
          String text) {}

  @Schema(
      name = "VoiceMeetingMinutesActionItemsCreateRequest",
      description = "Create Kanban tasks from AI minutes action items")
  public record MinutesActionItemsCreate(
      @Schema(description = "Action items to add to the Kanban board")
          @NotNull(message = "등록할 할 일을 선택해 주세요.")
          @Size(max = 20, message = "한 번에 등록할 수 있는 할 일은 20개까지입니다.")
          List<@Valid MinutesActionItemCreate> actionItems) {}

  @Schema(
      name = "VoiceMeetingMinutesActionItemCreateRequest",
      description = "AI minutes action item to create as a Kanban task")
  public record MinutesActionItemCreate(
      @Schema(description = "Task title", example = "결제 UI 최종 시안 에셋 정리 및 공유")
          @NotBlank(message = "할 일 제목을 입력해 주세요.")
          @Size(max = 150, message = "할 일 제목은 150자 이하여야 합니다.")
          String title,
      @Schema(description = "Task description")
          @Size(max = 1000, message = "할 일 설명은 1000자 이하여야 합니다.")
          String description,
      @Schema(description = "Task priority", example = "MEDIUM") WorkspaceTaskPriority priority,
      @Schema(description = "Assignee name mentioned in the meeting")
          @Size(max = 100, message = "담당자 이름은 100자 이하여야 합니다.")
          String assigneeName,
      @Schema(description = "Due date mentioned in the meeting", example = "2026-06-01")
          LocalDate dueDate) {}
}

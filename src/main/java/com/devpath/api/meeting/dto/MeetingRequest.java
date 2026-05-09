package com.devpath.api.meeting.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class MeetingRequest {

  private MeetingRequest() {}

  @Schema(name = "MeetingCreateRequest", description = "회의방 생성 요청")
  public record Create(

      // 회의가 속한 멘토링 ID다.
      @Schema(description = "멘토링 ID", example = "1") @NotNull(message = "멘토링 ID는 필수입니다.")
          Long mentoringId,

      @Schema(hidden = true) Long hostId,

      // 회의방 제목이다.
      @Schema(description = "회의 제목", example = "1주차 멘토링 코드 리뷰 회의")
          @NotBlank(message = "회의 제목은 필수입니다.")
          @Size(max = 150, message = "회의 제목은 150자 이하여야 합니다.")
          String title,

      // 외부 RTC 또는 Jitsi URL이다. 비워두면 백엔드에서 기본 Jitsi URL을 생성한다.
      @Schema(description = "회의 URL", example = "https://meet.jit.si/devpath-mentoring-1-week-1")
          @Size(max = 1000, message = "회의 URL은 1000자 이하여야 합니다.")
          String meetingUrl,

      // 회의 예정 시간이다.
      @Schema(description = "회의 예정 일시", example = "2026-05-10T20:00:00")
          LocalDateTime scheduledAt) {}

  @Schema(name = "MeetingEndRequest", description = "회의 종료 요청")
  public record End(

      @Schema(hidden = true) Long hostId) {}

  @Schema(name = "MeetingJoinRequest", description = "회의 참가 요청")
  public record Join(

      @Schema(hidden = true) Long userId) {}

  @Schema(name = "MeetingLeaveRequest", description = "회의 퇴장 요청")
  public record Leave(

      @Schema(hidden = true) Long userId) {}

  @Schema(name = "MeetingRecordingUrlRequest", description = "회의 녹화 URL 저장 요청")
  public record RecordingUrl(

      @Schema(hidden = true) Long hostId,

      // 녹화 파일 또는 외부 녹화 링크다.
      @Schema(
              description = "녹화 URL",
              example = "https://storage.devpath.local/recordings/meeting-1.mp4")
          @NotBlank(message = "녹화 URL은 필수입니다.")
          @Size(max = 1000, message = "녹화 URL은 1000자 이하여야 합니다.")
          String recordingUrl) {}
}

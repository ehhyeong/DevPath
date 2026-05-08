package com.devpath.api.meeting.dto;

import com.devpath.domain.meeting.entity.MeetingAttendance;
import com.devpath.domain.meeting.entity.MeetingParticipant;
import com.devpath.domain.meeting.entity.MeetingRoom;
import com.devpath.domain.meeting.entity.MeetingStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class MeetingResponse {

  private MeetingResponse() {}

  @Schema(name = "MeetingRoomDetailResponse", description = "회의방 상세 응답")
  public record RoomDetail(
      @Schema(description = "회의방 ID", example = "1") Long meetingId,
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String mentoringTitle,
      @Schema(description = "회의 생성자 ID", example = "1") Long hostId,
      @Schema(description = "회의 생성자 이름", example = "김멘토") String hostName,
      @Schema(description = "회의 제목", example = "1주차 멘토링 코드 리뷰 회의") String title,
      @Schema(description = "회의 URL", example = "https://meet.jit.si/devpath-mentoring-1-week-1")
          String meetingUrl,
      @Schema(
              description = "녹화 URL",
              example = "https://storage.devpath.local/recordings/meeting-1.mp4")
          String recordingUrl,
      @Schema(description = "회의 상태", example = "OPEN") MeetingStatus status,
      @Schema(description = "회의 예정 일시", example = "2026-05-10T20:00:00") LocalDateTime scheduledAt,
      @Schema(description = "회의 시작 일시", example = "2026-05-10T20:00:00") LocalDateTime startedAt,
      @Schema(description = "회의 종료 일시", example = "2026-05-10T21:00:00") LocalDateTime endedAt) {
    // 회의방 Entity를 상세 응답 DTO로 변환한다.
    public static RoomDetail from(MeetingRoom meeting) {
      return new RoomDetail(
          meeting.getId(),
          meeting.getMentoring().getId(),
          meeting.getMentoring().getPost().getTitle(),
          meeting.getHost().getId(),
          meeting.getHost().getName(),
          meeting.getTitle(),
          meeting.getMeetingUrl(),
          meeting.getRecordingUrl(),
          meeting.getStatus(),
          meeting.getScheduledAt(),
          meeting.getStartedAt(),
          meeting.getEndedAt());
    }
  }

  @Schema(name = "MeetingParticipantResponse", description = "회의 참가자 응답")
  public record ParticipantDetail(
      @Schema(description = "참가자 레코드 ID", example = "1") Long participantId,
      @Schema(description = "회의방 ID", example = "1") Long meetingId,
      @Schema(description = "사용자 ID", example = "2") Long userId,
      @Schema(description = "사용자 이름", example = "이학습") String userName,
      @Schema(description = "현재 접속 여부", example = "true") Boolean active,
      @Schema(description = "입장 일시", example = "2026-05-10T20:01:00") LocalDateTime joinedAt,
      @Schema(description = "퇴장 일시", example = "2026-05-10T20:50:00") LocalDateTime leftAt) {
    // 회의 참가자 Entity를 응답 DTO로 변환한다.
    public static ParticipantDetail from(MeetingParticipant participant) {
      return new ParticipantDetail(
          participant.getId(),
          participant.getMeeting().getId(),
          participant.getUser().getId(),
          participant.getUser().getName(),
          participant.getActive(),
          participant.getJoinedAt(),
          participant.getLeftAt());
    }
  }

  @Schema(name = "MeetingAttendanceResponse", description = "회의 출석 이력 응답")
  public record AttendanceDetail(
      @Schema(description = "출석 이력 ID", example = "1") Long attendanceId,
      @Schema(description = "회의방 ID", example = "1") Long meetingId,
      @Schema(description = "사용자 ID", example = "2") Long userId,
      @Schema(description = "사용자 이름", example = "이학습") String userName,
      @Schema(description = "입장 일시", example = "2026-05-10T20:01:00") LocalDateTime joinedAt,
      @Schema(description = "퇴장 일시", example = "2026-05-10T20:50:00") LocalDateTime leftAt,
      @Schema(description = "참여 시간 초", example = "2940") Long durationSeconds) {
    // 출석 이력을 응답 DTO로 변환한다.
    public static AttendanceDetail from(MeetingAttendance attendance) {
      return new AttendanceDetail(
          attendance.getId(),
          attendance.getMeeting().getId(),
          attendance.getUser().getId(),
          attendance.getUser().getName(),
          attendance.getJoinedAt(),
          attendance.getLeftAt(),
          attendance.getDurationSeconds());
    }
  }
}

package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class MentoringWorkspaceResponse {

  private MentoringWorkspaceResponse() {}

  @Schema(name = "MentoringWorkspaceResponse", description = "멘토링 워크스페이스 응답")
  public record Workspace(
      @Schema(
              description = "멘토링 기본 정보",
              example = "{\"mentoringId\":1,\"postTitle\":\"Spring Boot 포트폴리오 멘토링\"}")
          BasicInfo basicInfo,
      @Schema(
              description = "멘토 정보",
              example = "{\"userId\":1,\"name\":\"김멘토\",\"role\":\"MENTOR\"}")
          Participant mentor,
      @Schema(
              description = "멘티 정보",
              example = "{\"userId\":2,\"name\":\"이학습\",\"role\":\"MENTEE\"}")
          Participant mentee,
      @Schema(
              description = "워크스페이스 집계 정보",
              example =
                  "{\"missionCount\":1,\"pullRequestCount\":1,\"questionCount\":1,\"meetingCount\":1}")
          Stats stats,
      @Schema(
              description = "최근 활동 요약",
              example = "[{\"type\":\"MENTORING_STARTED\",\"message\":\"멘토링이 시작되었습니다.\"}]")
          List<RecentActivity> recentActivities) {

    // 워크스페이스 화면에서 필요한 기본 정보, 참여자, 집계, 최근 활동을 한 번에 묶는다.
    public static Workspace from(
        Mentoring mentoring, Stats stats, List<RecentActivity> recentActivities) {
      return new Workspace(
          BasicInfo.from(mentoring),
          Participant.mentorFrom(mentoring),
          Participant.menteeFrom(mentoring),
          stats,
          recentActivities);
    }
  }

  @Schema(name = "MentoringDashboardResponse", description = "멘토링 대시보드 응답")
  public record Dashboard(
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String title,
      @Schema(description = "멘토링 상태", example = "ONGOING") MentoringStatus status,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "멘티 이름", example = "이학습") String menteeName,
      @Schema(description = "미션 개수", example = "0") long missionCount,
      @Schema(description = "PR 제출 개수", example = "0") long pullRequestCount,
      @Schema(description = "질문 개수", example = "0") long questionCount,
      @Schema(description = "회의 개수", example = "0") long meetingCount,
      @Schema(
              description = "최근 활동 요약",
              example = "[{\"type\":\"MENTORING_STARTED\",\"message\":\"멘토링이 시작되었습니다.\"}]")
          List<RecentActivity> recentActivities) {

    // 대시보드 카드와 요약 영역에 바로 사용할 수 있는 납작한 형태의 응답을 만든다.
    public static Dashboard from(
        Mentoring mentoring, Stats stats, List<RecentActivity> recentActivities) {
      return new Dashboard(
          mentoring.getId(),
          mentoring.getPost().getTitle(),
          mentoring.getStatus(),
          mentoring.getMentor().getName(),
          mentoring.getMentee().getName(),
          stats.missionCount(),
          stats.pullRequestCount(),
          stats.questionCount(),
          stats.meetingCount(),
          recentActivities);
    }
  }

  @Schema(name = "MentoringBasicInfoResponse", description = "멘토링 기본 정보 응답")
  public record BasicInfo(
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "멘토링 공고 ID", example = "1") Long postId,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String postTitle,
      @Schema(description = "필요 기술 스택", example = "Java, Spring Boot, JPA") String requiredStacks,
      @Schema(description = "멘토링 상태", example = "ONGOING") MentoringStatus status,
      @Schema(description = "멘토링 시작일시", example = "2026-05-02T12:00:00") LocalDateTime startedAt,
      @Schema(description = "멘토링 종료일시", example = "2026-05-20T12:00:00") LocalDateTime endedAt) {

    // 멘토링 엔티티의 기본 표시 정보를 DTO로 변환한다.
    public static BasicInfo from(Mentoring mentoring) {
      return new BasicInfo(
          mentoring.getId(),
          mentoring.getPost().getId(),
          mentoring.getPost().getTitle(),
          mentoring.getPost().getRequiredStacks(),
          mentoring.getStatus(),
          mentoring.getStartedAt(),
          mentoring.getEndedAt());
    }
  }

  @Schema(name = "MentoringParticipantResponse", description = "멘토링 참여자 응답")
  public record Participant(
      @Schema(description = "사용자 ID", example = "1") Long userId,
      @Schema(description = "사용자 이름", example = "김멘토") String name,
      @Schema(description = "멘토링 내 역할", example = "MENTOR") String role) {

    // 멘토 참여자 정보를 응답 DTO로 변환한다.
    public static Participant mentorFrom(Mentoring mentoring) {
      return new Participant(
          mentoring.getMentor().getId(), mentoring.getMentor().getName(), "MENTOR");
    }

    // 멘티 참여자 정보를 응답 DTO로 변환한다.
    public static Participant menteeFrom(Mentoring mentoring) {
      return new Participant(
          mentoring.getMentee().getId(), mentoring.getMentee().getName(), "MENTEE");
    }
  }

  @Schema(name = "MentoringWorkspaceStatsResponse", description = "멘토링 워크스페이스 집계 응답")
  public record Stats(
      @Schema(description = "미션 개수", example = "0") long missionCount,
      @Schema(description = "PR 제출 개수", example = "0") long pullRequestCount,
      @Schema(description = "질문 개수", example = "0") long questionCount,
      @Schema(description = "회의 개수", example = "0") long meetingCount) {

    // 후속 도메인 Repository가 연결되기 전까지 count API 계약을 먼저 고정한다.
    public static Stats of(
        long missionCount, long pullRequestCount, long questionCount, long meetingCount) {
      return new Stats(missionCount, pullRequestCount, questionCount, meetingCount);
    }
  }

  @Schema(name = "MentoringRecentActivityResponse", description = "멘토링 최근 활동 응답")
  public record RecentActivity(
      @Schema(description = "활동 타입", example = "MENTORING_STARTED") String type,
      @Schema(description = "활동 내용", example = "멘토링이 시작되었습니다.") String message,
      @Schema(description = "활동 발생일시", example = "2026-05-02T12:00:00") LocalDateTime occurredAt) {

    // 최근 활동 목록에 표시할 단일 활동 메시지를 만든다.
    public static RecentActivity of(String type, String message, LocalDateTime occurredAt) {
      return new RecentActivity(type, message, occurredAt);
    }
  }
}

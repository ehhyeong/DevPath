package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import com.devpath.domain.mentoring.entity.MentoringStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class MentoringHubResponse {

  private MentoringHubResponse() {}

  @Schema(name = "MentoringHubMainResponse", description = "멘토링 허브 응답")
  public record Hub(
      @Schema(
              description = "OPEN 상태 멘토링 공고 목록",
              example = "[{\"postId\":1,\"title\":\"Spring Boot 포트폴리오 멘토링\"}]")
          List<OpenPost> openPosts,
      @Schema(description = "허브 요약 정보", example = "{\"openPostCount\":5}") Summary summary) {

    public static Hub of(List<OpenPost> openPosts) {
      return new Hub(openPosts, Summary.from(openPosts.size()));
    }
  }

  @Schema(name = "MentoringHubSummaryResponse", description = "멘토링 허브 요약 응답")
  public record Summary(
      @Schema(description = "신청 가능한 멘토링 공고 수", example = "5") Integer openPostCount) {

    // 허브 화면 상단 카드에서 사용할 최소 집계 정보를 만든다.
    public static Summary from(Integer openPostCount) {
      return new Summary(openPostCount);
    }
  }

  @Schema(name = "MentoringOpenPostResponse", description = "멘토링 허브 OPEN 공고 응답")
  public record OpenPost(
      @Schema(description = "멘토링 공고 ID", example = "1") Long postId,
      @Schema(description = "멘토 사용자 ID", example = "1") Long mentorId,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "공고 제목", example = "Spring Boot 포트폴리오 멘토링") String title,
      @Schema(description = "필요 기술 스택", example = "Java, Spring Boot, JPA") String requiredStacks,
      @Schema(description = "최대 참여 인원", example = "5") Integer maxParticipants,
      @Schema(description = "공고 상태", example = "OPEN") MentoringPostStatus status,
      @Schema(description = "공고 생성일시", example = "2026-05-02T11:00:00") LocalDateTime createdAt) {

    // 허브에서는 신청 가능한 공고의 핵심 정보만 내려준다.
    public static OpenPost from(MentoringPost post) {
      return new OpenPost(
          post.getId(),
          post.getMentor().getId(),
          post.getMentor().getName(),
          post.getTitle(),
          post.getRequiredStacks(),
          post.getMaxParticipants(),
          post.getStatus(),
          post.getCreatedAt());
    }
  }

  @Schema(name = "MentoringOngoingResponse", description = "진행 중 멘토링 응답")
  public record Ongoing(
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "멘토링 공고 ID", example = "1") Long postId,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String postTitle,
      @Schema(description = "멘토 사용자 ID", example = "1") Long mentorId,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "멘티 사용자 ID", example = "2") Long menteeId,
      @Schema(description = "멘티 이름", example = "이학습") String menteeName,
      @Schema(description = "멘토링 상태", example = "ONGOING") MentoringStatus status,
      @Schema(description = "멘토링 시작일시", example = "2026-05-02T12:00:00") LocalDateTime startedAt) {

    // 진행 중 멘토링 목록에 필요한 정보를 DTO로 변환한다.
    public static Ongoing from(Mentoring mentoring) {
      return new Ongoing(
          mentoring.getId(),
          mentoring.getPost().getId(),
          mentoring.getPost().getTitle(),
          mentoring.getMentor().getId(),
          mentoring.getMentor().getName(),
          mentoring.getMentee().getId(),
          mentoring.getMentee().getName(),
          mentoring.getStatus(),
          mentoring.getStartedAt());
    }
  }

  @Schema(name = "MyMentoringResponse", description = "내 멘토링 워크스페이스 요약 응답")
  public record MyMentoring(
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "멘토링 공고 ID", example = "1") Long postId,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String postTitle,
      @Schema(description = "내 역할", example = "MENTOR") String myRole,
      @Schema(description = "상대 사용자 ID", example = "2") Long counterpartId,
      @Schema(description = "상대 사용자 이름", example = "이학습") String counterpartName,
      @Schema(description = "멘토링 상태", example = "ONGOING") MentoringStatus status,
      @Schema(description = "멘토링 시작일시", example = "2026-05-02T12:00:00") LocalDateTime startedAt) {

    // 내 워크스페이스 목록에서 멘토/멘티 역할에 따라 상대방 정보를 계산한다.
    public static MyMentoring from(Mentoring mentoring, Long userId) {
      boolean mentor = mentoring.getMentor().getId().equals(userId);

      return new MyMentoring(
          mentoring.getId(),
          mentoring.getPost().getId(),
          mentoring.getPost().getTitle(),
          mentor ? "MENTOR" : "MENTEE",
          mentor ? mentoring.getMentee().getId() : mentoring.getMentor().getId(),
          mentor ? mentoring.getMentee().getName() : mentoring.getMentor().getName(),
          mentoring.getStatus(),
          mentoring.getStartedAt());
    }
  }
}

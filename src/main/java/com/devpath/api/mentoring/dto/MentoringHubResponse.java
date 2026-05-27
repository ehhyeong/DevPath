package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import com.devpath.domain.mentoring.entity.MentoringStatus;
import com.devpath.domain.user.entity.UserProfile;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

public class MentoringHubResponse {

  private MentoringHubResponse() {}

  @Schema(name = "MentoringHubMainResponse", description = "멘토링 허브 응답")
  public record Hub(List<OpenPost> openPosts, Summary summary) {

    public static Hub of(List<OpenPost> openPosts) {
      long openCount = openPosts.stream().filter(post -> !post.closed()).count();
      return new Hub(openPosts, Summary.from((int) openCount, openPosts.size()));
    }
  }

  @Schema(name = "MentoringHubSummaryResponse", description = "멘토링 허브 요약 응답")
  public record Summary(Integer openPostCount, Integer totalPostCount) {

    public static Summary from(Integer openPostCount, Integer totalPostCount) {
      return new Summary(openPostCount, totalPostCount);
    }
  }

  @Schema(name = "MentoringOpenPostResponse", description = "멘토링 허브 게시글 응답")
  public record OpenPost(
      Long postId,
      Long mentorId,
      String mentorName,
      String mentorDescription,
      String mentorImage,
      String title,
      String content,
      String requiredStacks,
      List<String> stacks,
      String category,
      String mentoringType,
      String mentoringTypeLabel,
      Integer currentParticipants,
      Integer maxParticipants,
      Integer durationWeeks,
      LocalDate deadlineAt,
      Long deadlineDaysLeft,
      Long viewCount,
      List<String> curriculum,
      MentoringPostStatus status,
      Boolean closed,
      LocalDateTime createdAt) {

    public static OpenPost from(MentoringPost post) {
      return from(post, null);
    }

    public static OpenPost from(MentoringPost post, UserProfile mentorProfile) {
      String type = safe(post.getMentoringType(), "study");
      Integer currentParticipants =
          post.getCurrentParticipants() == null ? 0 : post.getCurrentParticipants();
      Integer maxParticipants =
          post.getMaxParticipants() == null
              ? Math.max(currentParticipants, 1)
              : post.getMaxParticipants();
      LocalDate deadlineAt = post.getDeadlineAt();

      return new OpenPost(
          post.getId(),
          post.getMentor().getId(),
          post.getMentor().getName(),
          resolveMentorDescription(post, mentorProfile),
          mentorProfile == null ? null : mentorProfile.getDisplayProfileImage(),
          post.getTitle(),
          post.getContent(),
          post.getRequiredStacks(),
          split(post.getRequiredStacks()),
          safe(post.getCategory(), "Backend"),
          type,
          typeLabel(type),
          currentParticipants,
          maxParticipants,
          post.getDurationWeeks() == null ? 4 : post.getDurationWeeks(),
          deadlineAt,
          daysLeft(deadlineAt),
          post.getViewCount() == null ? 0L : post.getViewCount(),
          splitLines(post.getCurriculum()),
          post.getStatus(),
          post.getStatus() == MentoringPostStatus.CLOSED,
          post.getCreatedAt());
    }
  }

  @Schema(name = "MentoringOngoingResponse", description = "진행 중 멘토링 응답")
  public record Ongoing(
      Long mentoringId,
      Long postId,
      String postTitle,
      Long mentorId,
      String mentorName,
      Long menteeId,
      String menteeName,
      MentoringStatus status,
      LocalDateTime startedAt) {

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
      Long mentoringId,
      Long postId,
      String postTitle,
      String myRole,
      Long counterpartId,
      String counterpartName,
      MentoringStatus status,
      LocalDateTime startedAt) {

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

  private static String resolveMentorDescription(MentoringPost post, UserProfile mentorProfile) {
    if (mentorProfile != null
        && mentorProfile.getBio() != null
        && !mentorProfile.getBio().isBlank()) {
      return mentorProfile.getBio();
    }
    return safe(post.getCategory(), "Backend") + " 멘토";
  }

  private static List<String> split(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return Arrays.stream(value.split(","))
        .map(String::trim)
        .filter(token -> !token.isBlank())
        .toList();
  }

  private static List<String> splitLines(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return Arrays.stream(value.split("\\R"))
        .map(String::trim)
        .filter(token -> !token.isBlank())
        .toList();
  }

  private static Long daysLeft(LocalDate deadlineAt) {
    if (deadlineAt == null) {
      return null;
    }
    return ChronoUnit.DAYS.between(LocalDate.now(), deadlineAt);
  }

  private static String safe(String value, String fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }
    return value.trim();
  }

  private static String typeLabel(String mentoringType) {
    return "team".equalsIgnoreCase(mentoringType) ? "팀 프로젝트형" : "공통 과제형";
  }
}

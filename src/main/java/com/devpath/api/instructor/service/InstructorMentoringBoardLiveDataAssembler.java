package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.mentoring.InstructorMentoringBoardPayload;
import com.devpath.domain.mentoring.entity.MentoringApplication;
import com.devpath.domain.mentoring.entity.MentoringApplicationStatus;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.repository.MentoringApplicationRepository;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class InstructorMentoringBoardLiveDataAssembler {

  private final MentoringApplicationRepository mentoringApplicationRepository;
  private final MentoringPostRepository mentoringPostRepository;

  InstructorMentoringBoardLiveDataAssembler(
      MentoringApplicationRepository mentoringApplicationRepository,
      MentoringPostRepository mentoringPostRepository) {
    this.mentoringApplicationRepository = mentoringApplicationRepository;
    this.mentoringPostRepository = mentoringPostRepository;
  }

  InstructorMentoringBoardPayload attachLiveData(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    return attachPendingApplications(instructorId, attachMentoringPosts(instructorId, payload));
  }

  InstructorMentoringBoardPayload filterPersistedLiveData(InstructorMentoringBoardPayload payload) {
    if (payload == null) {
      return new InstructorMentoringBoardPayload();
    }

    return new InstructorMentoringBoardPayload(
        payload.projects() == null
            ? List.of()
            : payload.projects().stream().filter(project -> !isLivePostProject(project)).toList(),
        payload.requests() == null
            ? List.of()
            : payload.requests().stream()
                .filter(request -> !isLiveApplicationRequest(request))
                .toList(),
        payload.ongoingProjects() == null ? List.of() : payload.ongoingProjects());
  }

  private InstructorMentoringBoardPayload attachMentoringPosts(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    List<MentoringPost> posts =
        mentoringPostRepository.findAllByMentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId);
    Map<String, InstructorMentoringBoardPayload.ProjectItem> mergedProjects = new LinkedHashMap<>();
    posts.forEach(
        post -> {
          InstructorMentoringBoardPayload.ProjectItem projectItem = toProjectItem(post);
          mergedProjects.put(projectItem.id(), projectItem);
        });

    if (payload.projects() != null) {
      payload.projects().stream()
          .filter(project -> !isLivePostProject(project))
          .forEach(project -> mergedProjects.putIfAbsent(project.id(), project));
    }

    return new InstructorMentoringBoardPayload(
        List.copyOf(mergedProjects.values()),
        payload.requests() == null ? List.of() : payload.requests(),
        payload.ongoingProjects() == null ? List.of() : payload.ongoingProjects());
  }

  private InstructorMentoringBoardPayload.ProjectItem toProjectItem(MentoringPost post) {
    String mode = normalizeMode(post.getMentoringType());
    List<String> tags = splitComma(post.getRequiredStacks());
    List<String> weeks = splitLines(post.getCurriculum());

    return new InstructorMentoringBoardPayload.ProjectItem(
        "post-" + post.getId(),
        post.getTitle(),
        post.getTitle(),
        post.getContent(),
        mode,
        post.getCategory() == null || post.getCategory().isBlank() ? "Backend" : post.getCategory(),
        "OPEN".equals(String.valueOf(post.getStatus())) ? "모집중" : "모집마감",
        post.getCurrentParticipants() == null ? 0 : post.getCurrentParticipants(),
        post.getMaxParticipants() == null ? 1 : post.getMaxParticipants(),
        List.of(),
        tags,
        post.getMentor().getName(),
        (post.getCategory() == null || post.getCategory().isBlank()
                ? "Backend"
                : post.getCategory())
            + " 멘토",
        post.getContent(),
        post.getDurationWeeks() == null ? 4 : post.getDurationWeeks(),
        weeks.isEmpty() ? List.of("오리엔테이션", "핵심 기능 구현", "멘토 코드 리뷰", "최종 발표") : weeks);
  }

  private InstructorMentoringBoardPayload attachPendingApplications(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    List<MentoringApplication> pendingApplications =
        mentoringApplicationRepository
            .findAllByPost_Mentor_IdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
                instructorId, MentoringApplicationStatus.PENDING);

    Map<String, InstructorMentoringBoardPayload.RequestItem> mergedRequests = new LinkedHashMap<>();
    pendingApplications.forEach(
        application -> {
          InstructorMentoringBoardPayload.RequestItem requestItem = toRequestItem(application);
          mergedRequests.put(requestItem.id(), requestItem);
        });

    if (payload.requests() != null) {
      payload.requests().stream()
          .filter(request -> !isLiveApplicationRequest(request))
          .forEach(request -> mergedRequests.putIfAbsent(request.id(), request));
    }

    return new InstructorMentoringBoardPayload(
        payload.projects() == null ? List.of() : payload.projects(),
        List.copyOf(mergedRequests.values()),
        payload.ongoingProjects() == null ? List.of() : payload.ongoingProjects());
  }

  private InstructorMentoringBoardPayload.RequestItem toRequestItem(
      MentoringApplication application) {
    MentoringPost post = application.getPost();
    String mode = normalizeMode(post.getMentoringType());
    String message = application.getMessage() == null ? "" : application.getMessage();

    return new InstructorMentoringBoardPayload.RequestItem(
        "application-" + application.getId(),
        application.getApplicant().getName(),
        application.getApplicant().getName(),
        formatSubmittedAt(application.getCreatedAt()),
        "post-" + post.getId(),
        post.getTitle(),
        mode,
        resolveRole(mode, application.getDesiredPosition()),
        stripPortfolioLine(message),
        extractPortfolioUrl(message));
  }

  private boolean isLivePostProject(InstructorMentoringBoardPayload.ProjectItem project) {
    return project != null && project.id() != null && project.id().startsWith("post-");
  }

  private boolean isLiveApplicationRequest(InstructorMentoringBoardPayload.RequestItem request) {
    return request != null && request.id() != null && request.id().startsWith("application-");
  }

  private String normalizeMode(String mentoringType) {
    return "team".equalsIgnoreCase(mentoringType) ? "team" : "study";
  }

  private String resolveRole(String mode, String desiredPosition) {
    if ("team".equals(mode)) {
      return desiredPosition == null || desiredPosition.isBlank() ? "직군 미정" : desiredPosition;
    }
    return "직접 무관";
  }

  private String stripPortfolioLine(String message) {
    return message
        .lines()
        .filter(line -> !line.trim().startsWith("포트폴리오:"))
        .reduce((left, right) -> left + "\n" + right)
        .orElse("")
        .trim();
  }

  private String extractPortfolioUrl(String message) {
    return message
        .lines()
        .map(String::trim)
        .filter(line -> line.startsWith("포트폴리오:"))
        .map(line -> line.substring("포트폴리오:".length()).trim())
        .filter(value -> !value.isBlank())
        .findFirst()
        .orElse("");
  }

  private String formatSubmittedAt(LocalDateTime createdAt) {
    if (createdAt == null) {
      return "방금 전";
    }

    Duration duration = Duration.between(createdAt, LocalDateTime.now());
    long minutes = Math.max(0, duration.toMinutes());
    if (minutes < 1) {
      return "방금 전";
    }
    if (minutes < 60) {
      return minutes + "분 전";
    }
    long hours = duration.toHours();
    if (hours < 24) {
      return hours + "시간 전";
    }
    long days = duration.toDays();
    if (days == 1) {
      return "어제";
    }
    if (days < 7) {
      return days + "일 전";
    }
    return createdAt.toLocalDate().toString();
  }

  private List<String> splitComma(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return List.of(value.split(",")).stream()
        .map(String::trim)
        .filter(token -> !token.isBlank())
        .toList();
  }

  private List<String> splitLines(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return value.lines().map(String::trim).filter(token -> !token.isBlank()).toList();
  }
}

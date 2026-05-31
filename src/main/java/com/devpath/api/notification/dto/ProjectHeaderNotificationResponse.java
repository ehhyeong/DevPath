package com.devpath.api.notification.dto;

import com.devpath.domain.notification.entity.InstructorNotification;
import com.devpath.domain.notification.entity.InstructorNotificationType;
import com.devpath.domain.notification.entity.LearnerNotification;
import com.devpath.domain.notification.entity.LearnerNotificationType;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.TeamWorkspaceHeaderNotification;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ProjectHeaderNotificationResponse {

  private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
  private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("M월 d일");

  private Long id;
  private String type;
  private String text;
  private String dateText;
  private Boolean read;
  private String targetPath;
  private LocalDateTime createdAt;
  private String source;

  public static ProjectHeaderNotificationResponse from(LearnerNotification notification) {
    LearnerNotificationType type = notification.getType();
    return ProjectHeaderNotificationResponse.builder()
        .id(notification.getId())
        .type(type == null ? "SYSTEM" : type.name())
        .text(notification.getMessage())
        .dateText(timeText(notification.getCreatedAt()))
        .read(Boolean.TRUE.equals(notification.getIsRead()))
        .targetPath(targetPathFor(type))
        .createdAt(notification.getCreatedAt())
        .source("learner")
        .build();
  }

  public static ProjectHeaderNotificationResponse from(InstructorNotification notification) {
    InstructorNotificationType type = notification.getType();
    return ProjectHeaderNotificationResponse.builder()
        .id(notification.getId())
        .type(type == null ? "SYSTEM" : type.name())
        .text(notification.getMessage())
        .dateText(timeText(notification.getCreatedAt()))
        .read(Boolean.TRUE.equals(notification.getIsRead()))
        .targetPath(targetPathFor(type))
        .createdAt(notification.getCreatedAt())
        .source("instructor")
        .build();
  }

  public static ProjectHeaderNotificationResponse fromWorkspaceActivity(
      TeamWorkspaceHeaderNotification notification, String workspaceName) {
    String pageKey = notification.getPageKey();
    return ProjectHeaderNotificationResponse.builder()
        .id(-1_000_000L - notification.getId())
        .type(typeForPage(pageKey))
        .text(prefixWorkspaceName(workspaceName, notification.getMessage()))
        .dateText(timeText(notification.getCreatedAt()))
        .read(true)
        .targetPath(withWorkspaceId(notification.getTargetPath(), notification.getWorkspaceId()))
        .createdAt(notification.getCreatedAt())
        .source("workspace")
        .build();
  }

  public static ProjectHeaderNotificationResponse fromTodaySchedule(
      CalendarEvent event, Workspace workspace) {
    return ProjectHeaderNotificationResponse.builder()
        .id(-2_000_000L - event.getId())
        .type(typeForEvent(event))
        .text(scheduleText(event, workspace.getName()))
        .dateText("오늘 " + event.getStartAt().format(TIME_FORMATTER))
        .read(true)
        .targetPath(scheduleTargetPath(workspace))
        .createdAt(event.getStartAt())
        .source("schedule")
        .build();
  }

  private static String prefixWorkspaceName(String workspaceName, String message) {
    if (workspaceName == null || workspaceName.isBlank()) {
      return message;
    }

    return workspaceName + " · " + message;
  }

  private static String scheduleText(CalendarEvent event, String workspaceName) {
    String time = event.getStartAt().format(TIME_FORMATTER);
    String title = event.getTitle();
    String normalized = normalizeText(title + " " + event.getDescription());
    String label =
        normalized.contains("weekly")
                || normalized.contains("meeting")
                || normalized.contains("scrum")
                || normalized.contains("주간")
                || normalized.contains("회의")
                || normalized.contains("스크럼")
            ? "회의"
            : "일정";

    return "오늘 " + time + " " + workspaceName + " " + label + "이 있습니다: " + title;
  }

  private static String typeForEvent(CalendarEvent event) {
    String normalized = normalizeText(event.getTitle() + " " + event.getDescription());
    if (normalized.contains("deadline") || normalized.contains("마감") || normalized.contains("제출")) {
      return "PROJECT_DEADLINE_TODAY";
    }
    if (normalized.contains("meeting")
        || normalized.contains("weekly")
        || normalized.contains("scrum")
        || normalized.contains("주간")
        || normalized.contains("회의")
        || normalized.contains("스크럼")) {
      return "PROJECT_MEETING_TODAY";
    }

    return "PROJECT_SCHEDULE_TODAY";
  }

  private static String typeForPage(String pageKey) {
    String normalized = normalizeText(pageKey);
    if (normalized.contains("schedule")) {
      return "PROJECT_SCHEDULE";
    }
    if (normalized.contains("meeting") || normalized.contains("voice")) {
      return "PROJECT_MEETING";
    }
    if (normalized.contains("review") || normalized.contains("comment")) {
      return "PROJECT_REVIEW";
    }
    if (normalized.contains("file")) {
      return "PROJECT_FILE";
    }
    if (normalized.contains("erd") || normalized.contains("architecture")) {
      return "PROJECT_DESIGN";
    }

    return "PROJECT";
  }

  private static String normalizeText(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT);
  }

  private static String targetPathFor(LearnerNotificationType type) {
    if (type == null) {
      return "/home";
    }

    return switch (type) {
      case APPLICATION_APPROVED,
          APPLICATION_REJECTED,
          LOUNGE_APPLICATION_RECEIVED,
          SQUAD_INVITED,
          SQUAD_KICKED ->
          "/lounge-dashboard";
      case COMMUNITY_COMMENTED -> "/community-list";
      case WORKSPACE_ANSWER_CREATED -> "/team-ws-review";
      case MENTORING_ANSWER_CREATED, MISSION_PASSED, MISSION_REJECTED -> "/mentoring-hub";
      case PR_REVIEW_CREATED -> "/team-ws-review";
      case PROJECT -> "/workspace-hub";
      default -> "/home";
    };
  }

  private static String targetPathFor(InstructorNotificationType type) {
    if (type == null) {
      return "/instructor-dashboard";
    }

    return switch (type) {
      case REVIEW -> "/instructor-reviews";
      case QNA -> "/instructor-qna";
      case SUBSCRIBE -> "/instructor-channel";
      case MENTORING_APPLICATION -> "/instructor-mentoring";
      case SYSTEM -> "/instructor-dashboard";
    };
  }

  private static String scheduleTargetPath(Workspace workspace) {
    String basePath =
        workspace.getType() == WorkspaceType.SQUAD ? "/squad-schedule" : "/team-ws-schedule";

    return basePath + "?workspaceId=" + workspace.getId();
  }

  private static String withWorkspaceId(String targetPath, Long workspaceId) {
    String basePath = targetPath == null || targetPath.isBlank() ? "/workspace-hub" : targetPath;
    if (basePath.contains("workspaceId=")) {
      return basePath;
    }

    return basePath + (basePath.contains("?") ? "&" : "?") + "workspaceId=" + workspaceId;
  }

  private static String timeText(LocalDateTime value) {
    if (value == null) {
      return "";
    }

    LocalDate date = value.toLocalDate();
    LocalDate today = LocalDate.now();
    if (date.equals(today)) {
      return "오늘 " + value.format(TIME_FORMATTER);
    }
    if (date.equals(today.minusDays(1))) {
      return "어제 " + value.format(TIME_FORMATTER);
    }

    return value.format(DATE_FORMATTER);
  }
}

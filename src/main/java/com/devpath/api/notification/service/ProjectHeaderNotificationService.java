package com.devpath.api.notification.service;

import com.devpath.api.notification.dto.ProjectHeaderNotificationResponse;
import com.devpath.domain.notification.repository.LearnerNotificationRepository;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.TeamWorkspaceHeaderNotification;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.TeamWorkspaceHeaderNotificationRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectHeaderNotificationService {

  private static final int MAX_HEADER_NOTIFICATIONS = 30;
  private static final int MAX_WORKSPACE_ACTIVITY_NOTIFICATIONS = 16;
  private static final int MAX_TODAY_SCHEDULE_NOTIFICATIONS = 8;

  private final LearnerNotificationRepository learnerNotificationRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceRepository workspaceRepository;
  private final CalendarEventRepository calendarEventRepository;
  private final TeamWorkspaceHeaderNotificationRepository headerNotificationRepository;

  public List<ProjectHeaderNotificationResponse> getNotifications(Long userId) {
    if (userId == null) {
      return List.of();
    }

    List<Long> workspaceIds = workspaceIdsFor(userId);
    Map<Long, Workspace> workspaceById = workspacesById(workspaceIds);

    List<ProjectHeaderNotificationResponse> notifications = new ArrayList<>();
    notifications.addAll(todayScheduleNotifications(workspaceIds, workspaceById));
    notifications.addAll(workspaceActivityNotifications(workspaceIds, workspaceById));
    notifications.addAll(learnerNotifications(userId));

    return notifications.stream()
        .sorted(
            Comparator.comparing(
                    ProjectHeaderNotificationResponse::getCreatedAt,
                    Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed())
        .limit(MAX_HEADER_NOTIFICATIONS)
        .toList();
  }

  @Transactional
  public List<ProjectHeaderNotificationResponse> markAllRead(Long userId) {
    learnerNotificationRepository
        .findAllByLearnerIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
        .stream()
        .filter(notification -> !Boolean.TRUE.equals(notification.getIsRead()))
        .forEach(notification -> notification.markAsRead());

    return getNotifications(userId);
  }

  private List<ProjectHeaderNotificationResponse> learnerNotifications(Long userId) {
    return learnerNotificationRepository.findAllByLearnerIdAndIsDeletedFalseOrderByCreatedAtDesc(userId).stream()
        .limit(MAX_HEADER_NOTIFICATIONS)
        .map(ProjectHeaderNotificationResponse::from)
        .toList();
  }

  private List<ProjectHeaderNotificationResponse> workspaceActivityNotifications(
      List<Long> workspaceIds, Map<Long, Workspace> workspaceById) {
    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    return headerNotificationRepository
        .findByWorkspaceIdInAndIsDeletedFalseOrderByCreatedAtDesc(workspaceIds)
        .stream()
        .filter(notification -> workspaceById.containsKey(notification.getWorkspaceId()))
        .limit(MAX_WORKSPACE_ACTIVITY_NOTIFICATIONS)
        .map(
            notification ->
                ProjectHeaderNotificationResponse.fromWorkspaceActivity(
                    notification, workspaceById.get(notification.getWorkspaceId()).getName()))
        .toList();
  }

  private List<ProjectHeaderNotificationResponse> todayScheduleNotifications(
      List<Long> workspaceIds, Map<Long, Workspace> workspaceById) {
    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    LocalDate today = LocalDate.now();
    LocalDateTime from = today.atStartOfDay();
    LocalDateTime to = today.plusDays(1).atStartOfDay().minusNanos(1);

    return calendarEventRepository
        .findAllByWorkspaceIdInAndStartAtBetweenAndIsDeletedFalseOrderByStartAtAsc(
            workspaceIds, from, to)
        .stream()
        .filter(event -> workspaceById.containsKey(event.getWorkspaceId()))
        .limit(MAX_TODAY_SCHEDULE_NOTIFICATIONS)
        .map(event -> ProjectHeaderNotificationResponse.fromTodaySchedule(event, workspaceById.get(event.getWorkspaceId())))
        .toList();
  }

  private List<Long> workspaceIdsFor(Long userId) {
    return workspaceMemberRepository.findAllByLearnerId(userId).stream()
        .map(WorkspaceMember::getWorkspaceId)
        .distinct()
        .toList();
  }

  private Map<Long, Workspace> workspacesById(List<Long> workspaceIds) {
    if (workspaceIds.isEmpty()) {
      return Map.of();
    }

    return workspaceRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(workspaceIds)
        .stream()
        .collect(Collectors.toMap(Workspace::getId, Function.identity()));
  }
}

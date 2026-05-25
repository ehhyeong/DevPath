package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceHubProjectService {

  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final CalendarEventRepository calendarEventRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;

  public List<WorkspaceHubProjectResponse> getProjects(Long userId) {
    if (userId == null) {
      return List.of();
    }

    return getUserWorkspaceProjects(userId);
  }

  private List<WorkspaceHubProjectResponse> getUserWorkspaceProjects(Long userId) {
    List<Long> workspaceIds =
        workspaceMemberRepository.findAllByLearnerId(userId).stream()
            .map(WorkspaceMember::getWorkspaceId)
            .distinct()
            .toList();

    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    List<Workspace> workspaces =
        workspaceRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(workspaceIds);
    Map<Long, List<WorkspaceMember>> membersByWorkspaceId =
        workspaceMemberRepository.findAllByWorkspaceIdIn(workspaceIds).stream()
            .collect(Collectors.groupingBy(WorkspaceMember::getWorkspaceId));
    Map<Long, List<WorkspaceTask>> assignedTasksByWorkspaceId =
        workspaceTaskRepository
            .findAllByWorkspaceIdInAndAssigneeIdAndIsDeletedFalseOrderByUpdatedAtDesc(
                workspaceIds, userId)
            .stream()
            .collect(Collectors.groupingBy(WorkspaceTask::getWorkspaceId));
    List<Long> mentorIds =
        workspaces.stream()
            .filter(workspace -> workspace.getType() == WorkspaceType.MENTORING)
            .map(Workspace::getOwnerId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
    Map<Long, User> mentorsById =
        mentorIds.isEmpty()
            ? Map.of()
            : userRepository.findAllById(mentorIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
    Map<Long, UserProfile> mentorProfilesByUserId =
        mentorIds.isEmpty()
            ? Map.of()
            : userProfileRepository.findAllByUserIdIn(mentorIds).stream()
                .collect(Collectors.toMap(profile -> profile.getUser().getId(), profile -> profile));
    Map<Long, CalendarEvent> nextScheduleByWorkspaceId =
        calendarEventRepository
            .findAllByWorkspaceIdInAndStartAtGreaterThanEqualAndIsDeletedFalseOrderByStartAtAsc(
                workspaceIds, LocalDateTime.now())
            .stream()
            .collect(
                Collectors.toMap(
                    CalendarEvent::getWorkspaceId, event -> event, (first, ignored) -> first));

    return workspaces.stream()
        .map(
            workspace ->
                toResponse(
                    workspace,
                    membersByWorkspaceId,
                    assignedTasksByWorkspaceId,
                    mentorsById,
                    mentorProfilesByUserId,
                    nextScheduleByWorkspaceId,
                    userId))
        .toList();
  }

  private WorkspaceHubProjectResponse toResponse(
      Workspace workspace,
      Map<Long, List<WorkspaceMember>> membersByWorkspaceId,
      Map<Long, List<WorkspaceTask>> assignedTasksByWorkspaceId,
      Map<Long, User> mentorsById,
      Map<Long, UserProfile> mentorProfilesByUserId,
      Map<Long, CalendarEvent> nextScheduleByWorkspaceId,
      Long userId) {
    return WorkspaceHubProjectResponse.fromWorkspace(
        workspace,
        membersByWorkspaceId.getOrDefault(workspace.getId(), List.of()),
        userId,
        mentorsById.get(workspace.getOwnerId()),
        mentorProfilesByUserId.get(workspace.getOwnerId()),
        nextScheduleByWorkspaceId.get(workspace.getId()),
        inferRoleLabel(
            workspace, assignedTasksByWorkspaceId.getOrDefault(workspace.getId(), List.of())));
  }

  private String inferRoleLabel(Workspace workspace, List<WorkspaceTask> tasks) {
    String taskRoleLabel = tasks.stream()
        .map(this::inferRoleKey)
        .filter(Objects::nonNull)
        .collect(Collectors.groupingBy(role -> role, Collectors.counting()))
        .entrySet()
        .stream()
        .max(Map.Entry.comparingByValue())
        .map(Map.Entry::getKey)
        .map(this::roleLabel)
        .orElse(null);

    if (taskRoleLabel != null || workspace.getType() != WorkspaceType.MENTORING) {
      return taskRoleLabel;
    }

    String workspaceRoleKey =
        inferWorkspaceRoleKey(
            (workspace.getName() == null ? "" : workspace.getName())
                + " "
                + (workspace.getDescription() == null ? "" : workspace.getDescription()));

    return workspaceRoleKey == null ? null : roleLabel(workspaceRoleKey);
  }

  private String inferRoleKey(WorkspaceTask task) {
    String text = ((task.getTitle() == null ? "" : task.getTitle()) + " "
            + (task.getDescription() == null ? "" : task.getDescription()))
        .toLowerCase();

    if (text.contains("[backend]")) {
      return "BACKEND";
    }
    if (text.contains("[frontend]")) {
      return "FRONTEND";
    }
    if (text.contains("[app]")) {
      return "APP";
    }
    if (text.matches(".*(\\[designer\\]|\\[design\\]).*")) {
      return "DESIGN";
    }
    if (text.contains("[pm]")) {
      return "PM";
    }
    if (text.matches(".*(backend|back-end|server|spring|jpa|api|db|database|redis|백엔드|서버|데이터베이스).*")) {
      return "BACKEND";
    }
    if (text.matches(".*(frontend|front-end|react|next|vue|ui|ux|화면|프론트).*")) {
      return "FRONTEND";
    }
    if (text.matches(".*(app|mobile|react native|android|ios|앱|모바일).*")) {
      return "APP";
    }
    if (text.matches(".*(design|designer|figma|wireframe|디자인|디자이너).*")) {
      return "DESIGN";
    }
    if (text.matches(".*(planning|planner|기획|pm).*")) {
      return "PM";
    }
    if (text.matches(".*(fullstack|full-stack|풀스택).*")) {
      return "FULLSTACK";
    }
    return null;
  }

  private String inferWorkspaceRoleKey(String rawText) {
    String text = rawText == null ? "" : rawText.toLowerCase();

    if (containsAny(
        text, "backend", "back-end", "server", "spring", "jpa", "api", "db", "database", "redis")) {
      return "BACKEND";
    }
    if (containsAny(
        text, "frontend", "front-end", "react", "next", "vue", "ui", "ux", "tailwind")) {
      return "FRONTEND";
    }
    if (containsAny(text, "app", "mobile", "react native", "android", "ios")) {
      return "APP";
    }
    if (containsAny(text, "design", "designer", "figma", "wireframe")) {
      return "DESIGN";
    }
    if (containsAny(text, "planning", "planner", "pm")) {
      return "PM";
    }
    if (containsAny(text, "fullstack", "full-stack")) {
      return "FULLSTACK";
    }

    return null;
  }

  private boolean containsAny(String text, String... keywords) {
    for (String keyword : keywords) {
      if (text.contains(keyword)) {
        return true;
      }
    }

    return false;
  }

  private String roleLabel(String roleKey) {
    return switch (roleKey) {
      case "BACKEND" -> "💻 Backend";
      case "FRONTEND" -> "🎨 Frontend";
      case "APP" -> "📱 App";
      case "DESIGN" -> "🎯 Design";
      case "PM" -> "📋 PM";
      case "FULLSTACK" -> "🧩 Fullstack";
      default -> roleKey;
    };
  }
}

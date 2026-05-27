package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringStatus;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceStatus;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
  private final MilestoneRepository milestoneRepository;
  private final CalendarEventRepository calendarEventRepository;
  private final MentoringRepository mentoringRepository;
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
    Map<Long, List<WorkspaceTask>> allTasksByWorkspaceId =
        workspaceTaskRepository
            .findAllByWorkspaceIdInAndIsDeletedFalseOrderByUpdatedAtDesc(workspaceIds)
            .stream()
            .collect(Collectors.groupingBy(WorkspaceTask::getWorkspaceId));
    Map<Long, List<Milestone>> milestonesByWorkspaceId =
        milestoneRepository
            .findAllByWorkspaceIdInAndIsDeletedFalseOrderByDueDateAsc(workspaceIds)
            .stream()
            .collect(Collectors.groupingBy(Milestone::getWorkspaceId));
    Map<Long, Mentoring> mentoringByWorkspaceId = findMentoringByWorkspaceId(workspaces, userId);
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
                .collect(
                    Collectors.toMap(profile -> profile.getUser().getId(), profile -> profile));
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
                    allTasksByWorkspaceId,
                    milestonesByWorkspaceId,
                    mentoringByWorkspaceId,
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
      Map<Long, List<WorkspaceTask>> allTasksByWorkspaceId,
      Map<Long, List<Milestone>> milestonesByWorkspaceId,
      Map<Long, Mentoring> mentoringByWorkspaceId,
      Map<Long, User> mentorsById,
      Map<Long, UserProfile> mentorProfilesByUserId,
      Map<Long, CalendarEvent> nextScheduleByWorkspaceId,
      Long userId) {
    List<WorkspaceTask> assignedTasks =
        assignedTasksByWorkspaceId.getOrDefault(workspace.getId(), List.of());
    List<WorkspaceTask> allTasks = allTasksByWorkspaceId.getOrDefault(workspace.getId(), List.of());
    List<Milestone> milestones = milestonesByWorkspaceId.getOrDefault(workspace.getId(), List.of());
    Mentoring mentoring = mentoringByWorkspaceId.get(workspace.getId());

    return WorkspaceHubProjectResponse.fromWorkspace(
        workspace,
        membersByWorkspaceId.getOrDefault(workspace.getId(), List.of()),
        userId,
        mentorsById.get(workspace.getOwnerId()),
        mentorProfilesByUserId.get(workspace.getOwnerId()),
        nextScheduleByWorkspaceId.get(workspace.getId()),
        inferRoleLabel(workspace, assignedTasks),
        calculateProgressPercent(workspace, allTasks, milestones, mentoring));
  }

  private int calculateProgressPercent(
      Workspace workspace,
      List<WorkspaceTask> allTasks,
      List<Milestone> milestones,
      Mentoring mentoring) {
    if (workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
      return 100;
    }

    if (isTeamMentoringWorkspace(workspace, mentoring)) {
      return milestoneProgressPercent(milestones, allTasks);
    }

    if (workspace.getType() == WorkspaceType.MENTORING) {
      return weeklyMentoringProgressPercent(mentoring);
    }

    return taskProgressPercent(allTasks);
  }

  private int taskProgressPercent(List<WorkspaceTask> tasks) {
    if (tasks.isEmpty()) {
      return 0;
    }

    long doneCount =
        tasks.stream().filter(task -> task.getStatus() == WorkspaceTaskStatus.DONE).count();

    return clampPercent(Math.round(doneCount * 100.0 / tasks.size()));
  }

  private int milestoneProgressPercent(
      List<Milestone> milestones, List<WorkspaceTask> fallbackTasks) {
    if (milestones.isEmpty()) {
      return taskProgressPercent(fallbackTasks);
    }

    long doneCount =
        milestones.stream()
            .filter(
                milestone ->
                    milestone.getStatus() == MilestoneStatus.DONE
                        || milestone.getStatus() == MilestoneStatus.CLOSED)
            .count();

    return clampPercent(Math.round(doneCount * 100.0 / milestones.size()));
  }

  private int weeklyMentoringProgressPercent(Mentoring mentoring) {
    if (mentoring == null) {
      return 0;
    }
    if (mentoring.getStatus() == MentoringStatus.COMPLETED) {
      return 100;
    }
    if (mentoring.getStatus() == MentoringStatus.CANCELLED) {
      return 0;
    }

    MentoringPost post = mentoring.getPost();
    int totalWeeks =
        post == null || post.getDurationWeeks() == null ? 4 : Math.max(1, post.getDurationWeeks());
    LocalDate startedOn =
        mentoring.getStartedAt() == null ? LocalDate.now() : mentoring.getStartedAt().toLocalDate();
    long elapsedWeeks = Math.max(0L, ChronoUnit.WEEKS.between(startedOn, LocalDate.now()));

    return clampPercent(Math.round(Math.min(totalWeeks, elapsedWeeks) * 100.0 / totalWeeks));
  }

  private int clampPercent(long value) {
    return (int) Math.max(0, Math.min(100, value));
  }

  private Map<Long, Mentoring> findMentoringByWorkspaceId(List<Workspace> workspaces, Long userId) {
    Map<Long, Mentoring> mentoringsById = new LinkedHashMap<>();
    mentoringRepository
        .findAllByMentee_IdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
        .forEach(mentoring -> mentoringsById.putIfAbsent(mentoring.getId(), mentoring));
    mentoringRepository
        .findAllByMentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
        .forEach(mentoring -> mentoringsById.putIfAbsent(mentoring.getId(), mentoring));

    if (mentoringsById.isEmpty()) {
      return Map.of();
    }

    List<Mentoring> mentorings = new ArrayList<>(mentoringsById.values());
    Map<Long, Mentoring> result = new LinkedHashMap<>();

    for (Workspace workspace : workspaces) {
      if (workspace.getType() != WorkspaceType.MENTORING) {
        continue;
      }

      Mentoring mentoring = matchMentoring(workspace, mentorings);
      if (mentoring != null) {
        result.put(workspace.getId(), mentoring);
      }
    }

    return result;
  }

  private Mentoring matchMentoring(Workspace workspace, List<Mentoring> mentorings) {
    String workspaceName = normalizeMatchText(workspace.getName());
    Long ownerId = workspace.getOwnerId();

    Mentoring ownerAndTitleMatch =
        mentorings.stream()
            .filter(
                mentoring ->
                    ownerId == null
                        || (mentoring.getMentor() != null
                            && ownerId.equals(mentoring.getMentor().getId())))
            .filter(
                mentoring ->
                    mentoring.getPost() != null
                        && workspaceName.equals(normalizeMatchText(mentoring.getPost().getTitle())))
            .findFirst()
            .orElse(null);

    if (ownerAndTitleMatch != null) {
      return ownerAndTitleMatch;
    }

    return mentorings.stream()
        .filter(
            mentoring ->
                mentoring.getPost() != null
                    && workspaceName.equals(normalizeMatchText(mentoring.getPost().getTitle())))
        .findFirst()
        .orElse(null);
  }

  private boolean isTeamMentoringWorkspace(Workspace workspace, Mentoring mentoring) {
    if (workspace.getType() != WorkspaceType.MENTORING) {
      return false;
    }

    MentoringPost post = mentoring == null ? null : mentoring.getPost();
    String mentoringType = post == null ? null : post.getMentoringType();
    if (mentoringType != null) {
      String normalizedType = mentoringType.trim().toLowerCase(Locale.ROOT);
      if (normalizedType.contains("team") || normalizedType.contains("project")) {
        return true;
      }
    }

    String text =
        normalizeMatchText(
            (workspace.getName() == null ? "" : workspace.getName())
                + " "
                + (workspace.getDescription() == null ? "" : workspace.getDescription()));

    return text.contains("teamproject")
        || text.contains("teamworkspace")
        || text.contains("팀프로젝트")
        || text.contains("팀워크스페이스");
  }

  private String normalizeMatchText(String value) {
    if (value == null) {
      return "";
    }

    return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
  }

  private String inferRoleLabel(Workspace workspace, List<WorkspaceTask> tasks) {
    String taskRoleLabel =
        tasks.stream()
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
    String text =
        ((task.getTitle() == null ? "" : task.getTitle())
                + " "
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
    if (text.matches(
        ".*(backend|back-end|server|spring|jpa|api|db|database|redis|백엔드|서버|데이터베이스).*")) {
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

package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteAcceptResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteLinkResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringStatus;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectRoleType;
import com.devpath.domain.project.entity.ProjectType;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.ActivityLog;
import com.devpath.domain.workspace.entity.ActivityLogType;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceStatus;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.ActivityLogRepository;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceHubProjectService {

  private static final long INVITE_EXPIRE_DAYS = 14L;
  private static final String INVITE_SIGNATURE_SECRET = "DevPathWorkspaceInviteV1";

  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final MilestoneRepository milestoneRepository;
  private final CalendarEventRepository calendarEventRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final MentoringRepository mentoringRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final ActivityLogRepository activityLogRepository;

  public List<WorkspaceHubProjectResponse> getProjects(Long userId) {
    if (userId == null) {
      return List.of();
    }

    return getUserWorkspaceProjects(userId);
  }

  public WorkspaceInviteLinkResponse createInviteLink(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspace(workspaceId);
    validateWorkspaceInviteSharer(workspace, userId);

    LocalDateTime expiresAt =
        LocalDateTime.now().plusDays(INVITE_EXPIRE_DAYS).truncatedTo(ChronoUnit.SECONDS);
    return new WorkspaceInviteLinkResponse(
        workspace.getId(), encodeInviteToken(workspace.getId(), expiresAt), expiresAt);
  }

  @Transactional
  public WorkspaceInviteAcceptResponse acceptInvite(String token, Long userId) {
    InvitePayload payload = decodeInviteToken(token);
    Workspace workspace = getWorkspace(payload.workspaceId());
    if (payload.expiresAt().isBefore(LocalDateTime.now())) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    boolean alreadyMember =
        workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspace.getId(), userId);
    if (!alreadyMember) {
      WorkspaceMember member =
          WorkspaceMember.builder().workspaceId(workspace.getId()).learnerId(userId).build();
      workspaceMemberRepository.save(member);
      activityLogRepository.save(
          ActivityLog.builder()
              .workspaceId(workspace.getId())
              .actorId(userId)
              .activityType(ActivityLogType.MEMBER_JOINED)
              .description("초대 링크로 새 멤버가 참여했습니다.")
              .build());
    }

    return new WorkspaceInviteAcceptResponse(
        workspace.getId(), WorkspaceHubProjectResponse.dashboardUrl(workspace), alreadyMember);
  }

  @Transactional
  public void leaveProject(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspace(workspaceId);
    if (canDeleteWorkspace(workspace, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }

    WorkspaceMember member =
        workspaceMemberRepository
            .findByWorkspaceIdAndLearnerId(workspace.getId(), userId)
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_FORBIDDEN));

    workspaceMemberRepository.delete(member);
    activityLogRepository.save(
        ActivityLog.builder()
            .workspaceId(workspace.getId())
            .actorId(userId)
            .activityType(ActivityLogType.MEMBER_LEFT)
            .description("멤버가 워크스페이스에서 나갔습니다.")
            .build());
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
    Map<Long, UserProfile> memberProfilesByUserId =
        membersByWorkspaceId.values().stream()
                .flatMap(List::stream)
                .map(WorkspaceMember::getLearnerId)
                .collect(Collectors.toSet())
                .isEmpty()
            ? Map.of()
            : userProfileRepository
                .findAllByUserIdIn(
                    membersByWorkspaceId.values().stream()
                        .flatMap(List::stream)
                        .map(WorkspaceMember::getLearnerId)
                        .collect(Collectors.toSet()))
                .stream()
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
    Map<Long, Boolean> canDeleteByWorkspaceId =
        workspaces.stream()
            .collect(
                Collectors.toMap(
                    Workspace::getId, workspace -> canDeleteWorkspace(workspace, userId)));

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
                    memberProfilesByUserId,
                    nextScheduleByWorkspaceId,
                    canDeleteByWorkspaceId,
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
      Map<Long, UserProfile> memberProfilesByUserId,
      Map<Long, CalendarEvent> nextScheduleByWorkspaceId,
      Map<Long, Boolean> canDeleteByWorkspaceId,
      Long userId) {
    List<WorkspaceTask> assignedTasks =
        assignedTasksByWorkspaceId.getOrDefault(workspace.getId(), List.of());
    List<WorkspaceTask> allTasks = allTasksByWorkspaceId.getOrDefault(workspace.getId(), List.of());
    List<WorkspaceMember> members = membersByWorkspaceId.getOrDefault(workspace.getId(), List.of());
    List<Milestone> milestones = milestonesByWorkspaceId.getOrDefault(workspace.getId(), List.of());
    Mentoring mentoring = mentoringByWorkspaceId.get(workspace.getId());

    return WorkspaceHubProjectResponse.fromWorkspace(
        workspace,
        members,
        userId,
        mentorsById.get(workspace.getOwnerId()),
        mentorProfilesByUserId.get(workspace.getOwnerId()),
        memberProfilesByUserId,
        nextScheduleByWorkspaceId.get(workspace.getId()),
        inferRoleLabel(workspace, members, userId, assignedTasks),
        calculateProgressPercent(workspace, allTasks, milestones, mentoring),
        Boolean.TRUE.equals(canDeleteByWorkspaceId.get(workspace.getId())));
  }

  private boolean canDeleteWorkspace(Workspace workspace, Long userId) {
    if (userId == null) {
      return false;
    }

    if (workspace.getType() != WorkspaceType.SQUAD) {
      return workspace.getOwnerId() != null && workspace.getOwnerId().equals(userId);
    }

    return findMatchingSquadProjects(workspace).stream()
        .anyMatch(project -> isProjectLeader(project.getId(), userId));
  }

  private List<Project> findMatchingSquadProjects(Workspace workspace) {
    if (workspace.getName() == null || workspace.getName().isBlank()) {
      return List.of();
    }

    return projectRepository.findAllByNameAndProjectTypeAndIsDeletedFalse(
        workspace.getName(), ProjectType.SQUAD);
  }

  private boolean isProjectLeader(Long projectId, Long userId) {
    return projectMemberRepository
        .findByProjectIdAndLearnerId(projectId, userId)
        .map(member -> member.getRoleType() == ProjectRoleType.LEADER)
        .orElse(false);
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
      return milestoneScheduleProgressPercent(milestones, allTasks);
    }

    if (workspace.getType() == WorkspaceType.MENTORING) {
      return assignmentScheduleProgressPercent(allTasks, mentoring);
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

  private int milestoneScheduleProgressPercent(
      List<Milestone> milestones, List<WorkspaceTask> fallbackTasks) {
    if (milestones.isEmpty()) {
      return taskProgressPercent(fallbackTasks);
    }

    LocalDate today = LocalDate.now();
    long doneCount =
        milestones.stream()
            .filter(
                milestone ->
                    milestone.getStatus() == MilestoneStatus.DONE
                        || milestone.getStatus() == MilestoneStatus.CLOSED
                        || today.isAfter(milestone.getDueDate()))
            .count();

    return clampPercent(Math.round(doneCount * 100.0 / milestones.size()));
  }

  private int assignmentScheduleProgressPercent(List<WorkspaceTask> tasks, Mentoring mentoring) {
    if (tasks.isEmpty()) {
      return weeklyMentoringProgressPercent(mentoring);
    }

    List<WorkspaceTask> sortedTasks =
        tasks.stream()
            .sorted(
                Comparator.comparing(
                        WorkspaceTask::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(
                        WorkspaceTask::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(WorkspaceTask::getId))
            .toList();
    Map<Integer, List<WorkspaceTask>> tasksByWeek = new LinkedHashMap<>();

    for (int index = 0; index < sortedTasks.size(); index++) {
      WorkspaceTask task = sortedTasks.get(index);
      int week = inferAssignmentWeek(task, (index % 4) + 1);
      tasksByWeek.computeIfAbsent(week, ignored -> new ArrayList<>()).add(task);
    }

    if (tasksByWeek.isEmpty()) {
      return weeklyMentoringProgressPercent(mentoring);
    }

    LocalDate today = LocalDate.now();
    long completedCount =
        tasksByWeek.values().stream()
            .filter(weekTasks -> assignmentWeekCompleted(weekTasks, today))
            .count();

    return clampPercent(Math.round(completedCount * 100.0 / tasksByWeek.size()));
  }

  private boolean assignmentWeekCompleted(List<WorkspaceTask> weekTasks, LocalDate today) {
    if (weekTasks.isEmpty()) {
      return false;
    }

    boolean allDone =
        weekTasks.stream().allMatch(task -> task.getStatus() == WorkspaceTaskStatus.DONE);
    if (allDone) {
      return true;
    }

    LocalDate latestDueDate =
        weekTasks.stream()
            .map(WorkspaceTask::getDueDate)
            .filter(Objects::nonNull)
            .max(LocalDate::compareTo)
            .orElse(null);

    return latestDueDate != null && today.isAfter(latestDueDate);
  }

  private int inferAssignmentWeek(WorkspaceTask task, int fallbackWeek) {
    Integer titleWeek = parseWeekNumber(task.getTitle());
    if (titleWeek != null) {
      return titleWeek;
    }

    Integer descriptionWeek = parseWeekNumber(task.getDescription());
    return descriptionWeek == null ? fallbackWeek : descriptionWeek;
  }

  private Integer parseWeekNumber(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    String text = value.toLowerCase(Locale.ROOT);
    for (int week = 1; week <= 52; week++) {
      if (text.contains(week + "주차")
          || text.contains(week + " 주차")
          || text.contains("week " + week)
          || text.contains("week" + week)) {
        return week;
      }
    }

    return null;
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

  private String inferRoleLabel(
      Workspace workspace, List<WorkspaceMember> members, Long userId, List<WorkspaceTask> tasks) {
    String memberRoleLabel =
        members.stream()
            .filter(member -> userId != null && userId.equals(member.getLearnerId()))
            .map(WorkspaceMember::getPositionLabel)
            .filter(position -> position != null && !position.isBlank())
            .findFirst()
            .map(this::roleLabelFromPosition)
            .orElse(null);

    if (memberRoleLabel != null) {
      return memberRoleLabel;
    }

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

  private String roleLabelFromPosition(String positionLabel) {
    if (positionLabel == null || positionLabel.isBlank()) {
      return null;
    }

    String normalized = positionLabel.trim().toLowerCase(Locale.ROOT);
    if (normalized.contains("front")) {
      return "FE";
    }
    if (normalized.contains("back")) {
      return "BE";
    }
    if (normalized.contains("full")) {
      return "FS";
    }
    if (normalized.contains("design") || normalized.contains("?붿옄")) {
      return "DES";
    }
    if (normalized.contains("pm") || normalized.contains("湲고쉷")) {
      return "PM";
    }
    if (normalized.contains("devops")
        || normalized.contains("infra")
        || normalized.contains("?명봽")) {
      return "OPS";
    }

    return positionLabel.trim();
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

  private Workspace getWorkspace(Long workspaceId) {
    return workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateWorkspaceInviteSharer(Workspace workspace, Long userId) {
    if (workspace.getOwnerId() != null && workspace.getOwnerId().equals(userId)) {
      return;
    }
    if (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspace.getId(), userId)) {
      return;
    }
    throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
  }

  private String encodeInviteToken(Long workspaceId, LocalDateTime expiresAt) {
    long expiresAtEpochSeconds = expiresAt.toEpochSecond(ZoneOffset.UTC);
    String payload = workspaceId + "." + expiresAtEpochSeconds;
    return payload + "." + sign(payload);
  }

  private InvitePayload decodeInviteToken(String token) {
    if (token == null || token.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    String[] parts = token.split("\\.");
    if (parts.length != 3) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    String payload = parts[0] + "." + parts[1];
    String expectedSignature = sign(payload);
    if (!MessageDigest.isEqual(
        expectedSignature.getBytes(StandardCharsets.UTF_8),
        parts[2].getBytes(StandardCharsets.UTF_8))) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    try {
      long workspaceId = Long.parseLong(parts[0]);
      long expiresAtEpochSeconds = Long.parseLong(parts[1]);
      return new InvitePayload(
          workspaceId, LocalDateTime.ofEpochSecond(expiresAtEpochSeconds, 0, ZoneOffset.UTC));
    } catch (NumberFormatException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }
  }

  private String sign(String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(
          new SecretKeySpec(
              INVITE_SIGNATURE_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return Base64.getUrlEncoder()
          .withoutPadding()
          .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
      throw new IllegalStateException("Workspace invite signing is unavailable.", exception);
    }
  }

  private record InvitePayload(Long workspaceId, LocalDateTime expiresAt) {}
}

package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteAcceptResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteLinkResponse;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.time.LocalDateTime;
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
  private final WorkspaceMembershipService membershipService;
  private final WorkspaceHubProgressCalculator progressCalculator;
  private final WorkspaceHubRoleResolver roleResolver;

  public List<WorkspaceHubProjectResponse> getProjects(Long userId) {
    if (userId == null) {
      return List.of();
    }

    return getUserWorkspaceProjects(userId);
  }

  public WorkspaceInviteLinkResponse createInviteLink(Long workspaceId, Long userId) {
    return membershipService.createInviteLink(workspaceId, userId);
  }

  @Transactional
  public WorkspaceInviteAcceptResponse acceptInvite(String token, Long userId) {
    return membershipService.acceptInvite(token, userId);
  }

  @Transactional
  public void leaveProject(Long workspaceId, Long userId) {
    membershipService.leaveProject(workspaceId, userId);
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
                    Workspace::getId,
                    workspace -> membershipService.canDeleteWorkspace(workspace, userId)));

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
        roleResolver.resolve(workspace, members, userId, assignedTasks),
        progressCalculator.calculate(workspace, allTasks, milestones, mentoring),
        Boolean.TRUE.equals(canDeleteByWorkspaceId.get(workspace.getId())));
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

  private String normalizeMatchText(String value) {
    if (value == null) {
      return "";
    }

    return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
  }
}

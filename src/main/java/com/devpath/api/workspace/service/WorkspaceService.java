package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.UpdateWorkspaceSettingsRequest;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.api.workspace.dto.WorkspaceHubSummaryResponse;
import com.devpath.api.workspace.dto.WorkspaceMemberResponse;
import com.devpath.api.workspace.dto.WorkspaceResponse;
import com.devpath.api.workspace.dto.WorkspaceSettingsResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.MentoringApplication;
import com.devpath.domain.mentoring.entity.MentoringApplicationStatus;
import com.devpath.domain.mentoring.repository.MentoringApplicationRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceService {

  private static final long ONLINE_WINDOW_SECONDS = 75;

  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final MilestoneRepository milestoneRepository;
  private final CalendarEventRepository calendarEventRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final MentoringApplicationRepository mentoringApplicationRepository;

  public List<WorkspaceResponse> getMyWorkspaces(Long userId, WorkspaceType type) {
    List<Long> workspaceIds = getWorkspaceIdsByMember(userId);
    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    List<Workspace> workspaces =
        (type == null)
            ? workspaceRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(workspaceIds)
            : workspaceRepository.findAllByIdInAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
                workspaceIds, type);

    return toResponsesWithMemberCount(workspaces);
  }

  public List<WorkspaceResponse> getMyProjectWorkspaces(Long userId) {
    List<Long> workspaceIds = getWorkspaceIdsByMember(userId);
    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    List<Workspace> workspaces =
        workspaceRepository.findAllByIdInAndTypeInAndIsDeletedFalseOrderByCreatedAtDesc(
            workspaceIds, List.of(WorkspaceType.SOLO, WorkspaceType.SQUAD));

    return toResponsesWithMemberCount(workspaces);
  }

  public List<WorkspaceResponse> getMySoloWorkspaces(Long userId) {
    List<Long> workspaceIds = getWorkspaceIdsByMember(userId);
    if (workspaceIds.isEmpty()) {
      return List.of();
    }

    List<Workspace> workspaces =
        workspaceRepository.findAllByIdInAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            workspaceIds, WorkspaceType.SOLO);

    return toResponsesWithMemberCount(workspaces);
  }

  public WorkspaceDashboardResponse getWorkspaceDashboard(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspaceEntity(workspaceId);
    validateMember(workspaceId, userId);

    List<WorkspaceMember> members = workspaceMemberRepository.findAllByWorkspaceId(workspaceId);
    List<WorkspaceMemberResponse> memberResponses = buildMemberResponses(workspace, members);
    long unresolvedTaskCount =
        workspaceTaskRepository.countByWorkspaceIdAndStatusNotAndIsDeletedFalse(
            workspaceId, WorkspaceTaskStatus.DONE);
    long activeMilestoneCount =
        milestoneRepository.countByWorkspaceIdAndStatusInAndIsDeletedFalse(
            workspaceId, List.of(MilestoneStatus.OPEN, MilestoneStatus.IN_PROGRESS));
    User owner =
        workspace.getOwnerId() == null
            ? null
            : userRepository.findById(workspace.getOwnerId()).orElse(null);
    UserProfile ownerProfile =
        owner == null ? null : userProfileRepository.findByUserId(owner.getId()).orElse(null);

    return WorkspaceDashboardResponse.fromMemberResponses(
        workspace,
        memberResponses,
        unresolvedTaskCount,
        activeMilestoneCount,
        owner == null ? null : owner.getName(),
        ownerProfile == null ? null : ownerProfile.getDisplayProfileImage(),
        ownerProfile == null ? null : ownerProfile.getBio());
  }

  public WorkspaceSettingsResponse getWorkspaceSettings(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspaceEntity(workspaceId);
    validateMember(workspaceId, userId);

    return buildWorkspaceSettingsResponse(workspace, userId);
  }

  @Transactional
  public WorkspaceSettingsResponse updateWorkspaceSettings(
      Long workspaceId, Long userId, UpdateWorkspaceSettingsRequest request) {
    Workspace workspace = getWorkspaceEntity(workspaceId);
    validateOwner(workspace, userId);

    workspace.updateSettings(
        request.getName().trim(), normalizeDescription(request.getDescription()));

    return buildWorkspaceSettingsResponse(workspace, userId);
  }

  @Transactional
  public WorkspaceSettingsResponse archiveWorkspace(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspaceEntity(workspaceId);
    validateOwner(workspace, userId);
    workspace.archive();

    return buildWorkspaceSettingsResponse(workspace, userId);
  }

  @Transactional
  public WorkspaceSettingsResponse restoreWorkspace(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspaceEntity(workspaceId);
    validateOwner(workspace, userId);
    workspace.restore();

    return buildWorkspaceSettingsResponse(workspace, userId);
  }

  @Transactional
  public void deleteWorkspace(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspaceEntity(workspaceId);
    validateOwner(workspace, userId);
    workspace.delete();
  }

  @Transactional
  public void touchWorkspacePresence(Long workspaceId, Long userId) {
    getWorkspaceEntity(workspaceId);
    WorkspaceMember member =
        workspaceMemberRepository
            .findByWorkspaceIdAndLearnerId(workspaceId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_FORBIDDEN));

    member.markActive(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
  }

  public WorkspaceHubSummaryResponse getHubSummary(Long userId) {
    List<Long> workspaceIds = getWorkspaceIdsByMember(userId);
    long total = workspaceIds.size();
    long active =
        workspaceIds.isEmpty() ? 0 : workspaceRepository.countByIdInAndIsDeletedFalse(workspaceIds);
    long unresolvedTasks =
        workspaceIds.isEmpty()
            ? 0
            : workspaceTaskRepository.countByWorkspaceIdInAndStatusNotAndIsDeletedFalse(
                workspaceIds, WorkspaceTaskStatus.DONE);
    long activeMilestones =
        workspaceIds.isEmpty()
            ? 0
            : milestoneRepository.countByWorkspaceIdInAndStatusInAndIsDeletedFalse(
                workspaceIds, List.of(MilestoneStatus.OPEN, MilestoneStatus.IN_PROGRESS));

    return WorkspaceHubSummaryResponse.builder()
        .totalWorkspaces(total)
        .activeWorkspaces(active)
        .totalUnresolvedTasks(unresolvedTasks)
        .totalActiveMilestones(activeMilestones)
        .build();
  }

  // --- 내부 헬퍼 ---

  private List<WorkspaceMemberResponse> buildMemberResponses(
      Workspace workspace, List<WorkspaceMember> members) {
    if (members.isEmpty()) {
      return List.of();
    }

    List<Long> userIds = members.stream().map(WorkspaceMember::getLearnerId).distinct().toList();
    Map<Long, User> usersById =
        userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
    Map<Long, UserProfile> profilesByUserId =
        userProfileRepository.findAllByUserIdIn(userIds).stream()
            .collect(Collectors.toMap(profile -> profile.getUser().getId(), Function.identity()));
    Map<Long, String> positionsByLearnerId = buildMentoringPositions(workspace, userIds);

    return members.stream()
        .map(
            member -> {
              String positionLabel =
                  firstNonBlank(
                      member.getPositionLabel(), positionsByLearnerId.get(member.getLearnerId()));
              return WorkspaceMemberResponse.from(
                  member,
                  usersById.get(member.getLearnerId()),
                  profilesByUserId.get(member.getLearnerId()),
                  isOnline(member),
                  positionLabel);
            })
        .toList();
  }

  private WorkspaceSettingsResponse buildWorkspaceSettingsResponse(
      Workspace workspace, Long viewerId) {
    List<WorkspaceMemberResponse> memberResponses =
        buildMemberResponses(workspace, workspaceMemberRepository.findAllByWorkspaceId(workspace.getId()));
    return WorkspaceSettingsResponse.from(workspace, memberResponses, viewerId);
  }

  private Map<Long, String> buildMentoringPositions(Workspace workspace, List<Long> learnerIds) {
    if (workspace == null || workspace.getOwnerId() == null || learnerIds.isEmpty()) {
      return Map.of();
    }

    return mentoringApplicationRepository
        .findAllByPost_Mentor_IdAndApplicant_IdInAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
            workspace.getOwnerId(), learnerIds, MentoringApplicationStatus.APPROVED)
        .stream()
        .filter(application -> application.getPost() != null)
        .filter(application -> Objects.equals(application.getPost().getTitle(), workspace.getName()))
        .map(
            application -> {
              String position =
                  firstNonBlank(
                      application.getDesiredPosition(),
                      parseDesiredPositionFromMessage(application.getMessage()));
              if (position == null || application.getApplicant() == null) {
                return null;
              }
              return Map.entry(application.getApplicant().getId(), position);
            })
        .filter(Objects::nonNull)
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (first, ignored) -> first));
  }

  private String parseDesiredPositionFromMessage(String message) {
    if (message == null || message.isBlank()) {
      return null;
    }
    for (String line : message.split("\\R")) {
      String trimmed = line.trim();
      if (trimmed.startsWith("지원 직군:")) {
        return normalizeNullable(trimmed.substring("지원 직군:".length()));
      }
    }
    return null;
  }

  private String firstNonBlank(String first, String second) {
    String normalizedFirst = normalizeNullable(first);
    return normalizedFirst == null ? normalizeNullable(second) : normalizedFirst;
  }

  private String normalizeNullable(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private Workspace getWorkspaceEntity(Long workspaceId) {
    return workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateMember(Long workspaceId, Long userId) {
    if (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      return;
    }
    // 워크스페이스 오너(강사)도 접근 허용
    boolean isOwner =
        workspaceRepository
            .findByIdAndIsDeletedFalse(workspaceId)
            .map(ws -> ws.getOwnerId().equals(userId))
            .orElse(false);
    if (!isOwner) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }

  private void validateOwner(Workspace workspace, Long userId) {
    validateMember(workspace.getId(), userId);
    if (!workspace.getOwnerId().equals(userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }

  private String normalizeDescription(String description) {
    if (description == null) {
      return null;
    }

    String trimmed = description.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private List<Long> getWorkspaceIdsByMember(Long userId) {
    return workspaceMemberRepository.findAllByLearnerId(userId).stream()
        .map(WorkspaceMember::getWorkspaceId)
        .toList();
  }

  private boolean isOnline(WorkspaceMember member) {
    LocalDateTime lastActiveAt = member.getLastActiveAt();
    if (lastActiveAt == null) {
      return false;
    }

    return lastActiveAt.isAfter(LocalDateTime.now().minusSeconds(ONLINE_WINDOW_SECONDS));
  }

  // N+1 방지: workspaceIds 일괄 조회 후 메모리 집계
  private List<WorkspaceResponse> toResponsesWithMemberCount(List<Workspace> workspaces) {
    if (workspaces.isEmpty()) {
      return List.of();
    }

    List<Long> ids = workspaces.stream().map(Workspace::getId).toList();
    Map<Long, Long> countByWorkspaceId =
        workspaceMemberRepository.findAllByWorkspaceIdIn(ids).stream()
            .collect(Collectors.groupingBy(WorkspaceMember::getWorkspaceId, Collectors.counting()));
    Map<Long, CalendarEvent> nextEventByWorkspaceId =
        calendarEventRepository
            .findAllByWorkspaceIdInAndStartAtGreaterThanEqualAndIsDeletedFalseOrderByStartAtAsc(
                ids, LocalDate.now().atStartOfDay())
            .stream()
            .collect(
                Collectors.toMap(
                    CalendarEvent::getWorkspaceId, event -> event, (first, ignored) -> first));

    return workspaces.stream()
        .map(
            w -> {
              CalendarEvent nextEvent = nextEventByWorkspaceId.get(w.getId());
              return WorkspaceResponse.from(
                  w,
                  countByWorkspaceId.getOrDefault(w.getId(), 0L).intValue(),
                  nextEvent == null ? null : nextEvent.getTitle(),
                  nextEvent == null ? null : nextEvent.getStartAt(),
                  nextEvent == null ? null : nextEvent.getEndAt());
            })
        .toList();
  }
}

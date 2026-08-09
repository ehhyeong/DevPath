package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.mentoring.InstructorMentoringBoardPayload;
import com.devpath.domain.mentoring.entity.MentoringApplicationStatus;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.repository.MentoringApplicationRepository;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
class InstructorMentoringWorkspaceSynchronizer {

  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final MilestoneRepository milestoneRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final MentoringApplicationRepository mentoringApplicationRepository;
  private final MentoringPostRepository mentoringPostRepository;

  InstructorMentoringWorkspaceSynchronizer(
      WorkspaceRepository workspaceRepository,
      WorkspaceMemberRepository workspaceMemberRepository,
      MilestoneRepository milestoneRepository,
      WorkspaceTaskRepository workspaceTaskRepository,
      MentoringApplicationRepository mentoringApplicationRepository,
      MentoringPostRepository mentoringPostRepository) {
    this.workspaceRepository = workspaceRepository;
    this.workspaceMemberRepository = workspaceMemberRepository;
    this.milestoneRepository = milestoneRepository;
    this.workspaceTaskRepository = workspaceTaskRepository;
    this.mentoringApplicationRepository = mentoringApplicationRepository;
    this.mentoringPostRepository = mentoringPostRepository;
  }

  InstructorMentoringBoardPayload synchronize(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    if (payload == null) {
      return new InstructorMentoringBoardPayload();
    }

    List<InstructorMentoringBoardPayload.OngoingProjectItem> ongoingProjects =
        payload.ongoingProjects() == null ? List.of() : payload.ongoingProjects();
    if (ongoingProjects.isEmpty()) {
      return payload;
    }

    List<Workspace> mentoringWorkspaces = new ArrayList<>(getMentoringWorkspaces(instructorId));
    List<InstructorMentoringBoardPayload.OngoingProjectItem> resolvedOngoingProjects =
        ongoingProjects.stream()
            .map(item -> createWorkspaceIfMissing(instructorId, item, mentoringWorkspaces))
            .toList();

    return new InstructorMentoringBoardPayload(
        payload.projects() == null ? List.of() : payload.projects(),
        payload.requests() == null ? List.of() : payload.requests(),
        removeStaleWorkspaceGeneratedDuplicates(resolvedOngoingProjects));
  }

  List<InstructorMentoringBoardPayload.OngoingProjectItem> getDefaultOngoingProjects(
      Long instructorId) {
    return getMentoringWorkspaces(instructorId).stream().map(this::toOngoingProject).toList();
  }

  private List<InstructorMentoringBoardPayload.OngoingProjectItem>
      removeStaleWorkspaceGeneratedDuplicates(
          List<InstructorMentoringBoardPayload.OngoingProjectItem> items) {
    List<String> liveStartedTitles =
        items.stream()
            .filter(this::isLivePostOngoingProject)
            .filter(this::hasCreatedWorkspaceMarker)
            .filter(item -> item.workspaceId() != null)
            .map(item -> normalizeTitle(item.title()))
            .filter(title -> !title.isBlank())
            .toList();
    if (liveStartedTitles.isEmpty()) {
      return items;
    }

    return items.stream()
        .filter(item -> !isStaleWorkspaceGeneratedDuplicate(item, liveStartedTitles))
        .toList();
  }

  private boolean isStaleWorkspaceGeneratedDuplicate(
      InstructorMentoringBoardPayload.OngoingProjectItem item, List<String> liveStartedTitles) {
    return item != null
        && item.id() != null
        && item.id().startsWith("ongoing-workspace-")
        && liveStartedTitles.contains(normalizeTitle(item.title()));
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem createWorkspaceIfMissing(
      Long instructorId,
      InstructorMentoringBoardPayload.OngoingProjectItem item,
      List<Workspace> mentoringWorkspaces) {
    if (item == null) {
      return null;
    }

    Optional<MentoringPost> post = findPostForOngoingProject(instructorId, item);
    InstructorMentoringBoardPayload.OngoingProjectItem resolved =
        withResolvedWorkspaceId(item, mentoringWorkspaces);
    if (resolved.workspaceId() != null) {
      syncWorkspaceMembers(resolved.workspaceId(), instructorId, post.orElse(null));
      return resolved;
    }
    if (!shouldCreateWorkspaceForOngoingProject(item)) {
      return resolved;
    }

    Workspace workspace = createWorkspaceForOngoingProject(instructorId, item, post.orElse(null));
    mentoringWorkspaces.add(0, workspace);

    post.ifPresent(MentoringPost::close);
    syncWorkspaceMembers(workspace.getId(), instructorId, post.orElse(null));
    seedWeeklyWorkspaceItems(workspace, instructorId, item, post.orElse(null));

    return copyWithCreatedWorkspaceId(item, workspace.getId());
  }

  private Optional<MentoringPost> findPostForOngoingProject(
      Long instructorId, InstructorMentoringBoardPayload.OngoingProjectItem item) {
    Long postId = parseLivePostId(item.id());
    if (postId == null) {
      return Optional.empty();
    }

    return mentoringPostRepository
        .findByIdAndIsDeletedFalse(postId)
        .filter(post -> post.getMentor() != null)
        .filter(post -> Objects.equals(post.getMentor().getId(), instructorId));
  }

  private boolean shouldCreateWorkspaceForOngoingProject(
      InstructorMentoringBoardPayload.OngoingProjectItem item) {
    return isLivePostOngoingProject(item)
        || (item != null
            && item.startDate() != null
            && !item.startDate().isBlank()
            && item.id() != null
            && !item.id().startsWith("ongoing-workspace-"));
  }

  private Workspace createWorkspaceForOngoingProject(
      Long instructorId,
      InstructorMentoringBoardPayload.OngoingProjectItem item,
      MentoringPost post) {
    Workspace workspace =
        Workspace.builder()
            .ownerId(instructorId)
            .name(firstNonBlank(post == null ? null : post.getTitle(), item.title(), "Mentoring"))
            .description(
                firstNonBlank(post == null ? null : post.getContent(), item.subtitle(), null))
            .type(WorkspaceType.MENTORING)
            .build();
    return workspaceRepository.save(workspace);
  }

  private void syncWorkspaceMembers(Long workspaceId, Long instructorId, MentoringPost post) {
    addWorkspaceMember(workspaceId, instructorId, "Mentor");
    if (post == null || post.getId() == null) {
      return;
    }

    mentoringApplicationRepository
        .findAllByPost_IdAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
            post.getId(), MentoringApplicationStatus.APPROVED)
        .forEach(
            application -> {
              if (application.getApplicant() == null) {
                return;
              }
              addWorkspaceMember(
                  workspaceId,
                  application.getApplicant().getId(),
                  firstNonBlank(application.getDesiredPosition(), null, "Mentee"));
            });
  }

  private void addWorkspaceMember(Long workspaceId, Long learnerId, String positionLabel) {
    if (workspaceId == null || learnerId == null) {
      return;
    }
    if (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, learnerId)) {
      return;
    }

    workspaceMemberRepository.save(
        WorkspaceMember.builder()
            .workspaceId(workspaceId)
            .learnerId(learnerId)
            .positionLabel(positionLabel)
            .build());
  }

  private void seedWeeklyWorkspaceItems(
      Workspace workspace,
      Long instructorId,
      InstructorMentoringBoardPayload.OngoingProjectItem item,
      MentoringPost post) {
    List<String> weeklyTitles = resolveWeeklyTitles(item, post);
    if (weeklyTitles.isEmpty()) {
      return;
    }

    LocalDate startDate = parseStartDate(item.startDate());
    for (int index = 0; index < weeklyTitles.size(); index++) {
      String title = (index + 1) + "주차 - " + weeklyTitles.get(index);
      LocalDate weekStart = startDate.plusWeeks(index);
      LocalDate weekDue = weekStart.plusDays(6);

      if ("team".equals(item.mode())) {
        milestoneRepository.save(
            Milestone.builder()
                .workspaceId(workspace.getId())
                .title(title)
                .startDate(weekStart)
                .dueDate(weekDue)
                .createdById(instructorId)
                .build());
      } else {
        workspaceTaskRepository.save(
            WorkspaceTask.builder()
                .workspaceId(workspace.getId())
                .title(title)
                .dueDate(weekDue)
                .createdById(instructorId)
                .build());
      }
    }
  }

  private List<String> resolveWeeklyTitles(
      InstructorMentoringBoardPayload.OngoingProjectItem item, MentoringPost post) {
    if (post != null) {
      List<String> curriculumTitles = splitLines(post.getCurriculum());
      if (!curriculumTitles.isEmpty()) {
        return curriculumTitles;
      }
    }

    return item.title() == null || item.title().isBlank()
        ? List.of()
        : List.of(item.title().trim());
  }

  private LocalDate parseStartDate(String startDate) {
    if (startDate == null || startDate.isBlank()) {
      return LocalDate.now();
    }
    try {
      return LocalDate.parse(startDate);
    } catch (DateTimeParseException ignored) {
      return LocalDate.now();
    }
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem withResolvedWorkspaceId(
      InstructorMentoringBoardPayload.OngoingProjectItem item, List<Workspace> workspaces) {
    if (isLivePostOngoingProject(item)) {
      Workspace workspace = null;
      if (hasCreatedWorkspaceMarker(item)) {
        workspace = findWorkspaceById(item.workspaceId(), workspaces).orElse(null);
      }
      return copyWithWorkspaceId(item, workspace == null ? null : workspace.getId());
    }

    if (item.workspaceId() != null) {
      Optional<Workspace> workspace = findWorkspaceById(item.workspaceId(), workspaces);
      if (workspace.filter(value -> hasSameWorkspaceTitle(item, value)).isPresent()) {
        return item;
      }
      return copyWithWorkspaceId(item, null);
    }

    Workspace workspace = findMatchingWorkspace(item, workspaces).orElse(null);
    return copyWithWorkspaceId(item, workspace == null ? null : workspace.getId());
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem copyWithWorkspaceId(
      InstructorMentoringBoardPayload.OngoingProjectItem item, Long workspaceId) {
    return new InstructorMentoringBoardPayload.OngoingProjectItem(
        item.id(),
        item.title(),
        item.subtitle(),
        item.week(),
        item.mode(),
        item.category(),
        item.progress(),
        item.primaryAction(),
        item.secondaryAction(),
        item.menuActions(),
        workspaceId,
        item.startDate());
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem copyWithCreatedWorkspaceId(
      InstructorMentoringBoardPayload.OngoingProjectItem item, Long workspaceId) {
    Long postId = parseLivePostId(item.id());
    String id = postId == null ? item.id() : "post-" + postId + "-workspace-" + workspaceId;
    return new InstructorMentoringBoardPayload.OngoingProjectItem(
        id,
        item.title(),
        item.subtitle(),
        item.week(),
        item.mode(),
        item.category(),
        item.progress(),
        item.primaryAction(),
        item.secondaryAction(),
        item.menuActions(),
        workspaceId,
        item.startDate());
  }

  private Long parseLivePostId(String id) {
    if (id == null || !id.startsWith("post-")) {
      return null;
    }
    StringBuilder digits = new StringBuilder();
    for (int index = "post-".length(); index < id.length(); index++) {
      char current = id.charAt(index);
      if (!Character.isDigit(current)) {
        break;
      }
      digits.append(current);
    }
    if (digits.isEmpty()) {
      return null;
    }
    try {
      return Long.valueOf(digits.toString());
    } catch (NumberFormatException exception) {
      return null;
    }
  }

  private boolean isLivePostOngoingProject(
      InstructorMentoringBoardPayload.OngoingProjectItem item) {
    return item != null && parseLivePostId(item.id()) != null;
  }

  private boolean hasCreatedWorkspaceMarker(
      InstructorMentoringBoardPayload.OngoingProjectItem item) {
    return item != null && item.id() != null && item.id().contains("-workspace-");
  }

  private Optional<Workspace> findWorkspaceById(Long workspaceId, List<Workspace> workspaces) {
    if (workspaceId == null) {
      return Optional.empty();
    }
    return workspaces.stream()
        .filter(workspace -> Objects.equals(workspace.getId(), workspaceId))
        .findFirst();
  }

  private boolean hasSameWorkspaceTitle(
      InstructorMentoringBoardPayload.OngoingProjectItem item, Workspace workspace) {
    return Objects.equals(normalizeTitle(item.title()), normalizeTitle(workspace.getName()));
  }

  private Optional<Workspace> findMatchingWorkspace(
      InstructorMentoringBoardPayload.OngoingProjectItem item, List<Workspace> workspaces) {
    return workspaces.stream()
        .filter(
            workspace ->
                item.title() != null
                    && (item.title().contains(workspace.getName())
                        || workspace.getName().contains(item.title())))
        .findFirst();
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem toOngoingProject(Workspace workspace) {
    boolean teamMode = workspace.getName().contains("Next") || workspace.getName().contains("팀");
    return new InstructorMentoringBoardPayload.OngoingProjectItem(
        "ongoing-workspace-" + workspace.getId(),
        workspace.getName(),
        workspace.getDescription() == null ? "멘토링 워크스페이스" : workspace.getDescription(),
        teamMode ? 2 : 3,
        teamMode ? "team" : "study",
        teamMode ? "Frontend" : "Backend",
        teamMode ? 50 : 35,
        "워크스페이스 이동",
        "일정 관리",
        teamMode ? List.of("워크스페이스 설정", "멤버 관리", "완료 처리") : List.of("과제 설정", "공지 전송", "멘토링 종료"),
        workspace.getId(),
        null);
  }

  private List<Workspace> getMentoringWorkspaces(Long instructorId) {
    return workspaceRepository.findAllByOwnerIdAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
        instructorId, WorkspaceType.MENTORING);
  }

  private String normalizeTitle(String title) {
    return title == null ? "" : title.trim();
  }

  private String firstNonBlank(String first, String second, String fallback) {
    if (first != null && !first.isBlank()) {
      return first.trim();
    }
    if (second != null && !second.isBlank()) {
      return second.trim();
    }
    return fallback;
  }

  private List<String> splitLines(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return value.lines().map(String::trim).filter(token -> !token.isBlank()).toList();
  }
}

package com.devpath.config;

import com.devpath.domain.operation.notice.WorkspaceNotice;
import com.devpath.domain.operation.notice.WorkspaceNoticeRepository;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectMember;
import com.devpath.domain.project.entity.ProjectRecruitingStatus;
import com.devpath.domain.project.entity.ProjectRoleType;
import com.devpath.domain.project.entity.ProjectStatus;
import com.devpath.domain.project.entity.ProjectType;
import com.devpath.domain.project.entity.ProjectVisibility;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionDifficulty;
import com.devpath.domain.qna.entity.QuestionScope;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.ActivityLog;
import com.devpath.domain.workspace.entity.ActivityLogType;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.MeetingNote;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceDoc;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import com.devpath.domain.workspace.entity.WorkspaceFileType;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.ActivityLogRepository;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.MeetingNoteRepository;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceDocRepository;
import com.devpath.domain.workspace.repository.WorkspaceFileRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 7)
@RequiredArgsConstructor
public class LocalLearnerWorkspaceHubSquadSeedInitializer implements CommandLineRunner {

  public static final String EXTRA_MEMBER_EMAIL = "devpath.squadmate@devpath.com";
  public static final String SEED_PASSWORD = "devpath1234";

  private static final String PROJECT_NAME = "DevPath";
  private static final String PROJECT_INTRO = "로드맵 기반 학습 플랫폼";

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final MilestoneRepository milestoneRepository;
  private final CalendarEventRepository calendarEventRepository;
  private final WorkspaceDocRepository workspaceDocRepository;
  private final WorkspaceFileRepository workspaceFileRepository;
  private final MeetingNoteRepository meetingNoteRepository;
  private final WorkspaceNoticeRepository workspaceNoticeRepository;
  private final QuestionRepository questionRepository;
  private final AnswerRepository answerRepository;
  private final ActivityLogRepository activityLogRepository;
  private final PasswordEncoder passwordEncoder;
  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    List<AccountSeed> accountSeeds = accountSeeds();
    AccountSeed ownerSeed =
        accountSeeds.stream()
            .filter(AccountSeed::owner)
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Hub squad owner seed is missing"));
    AccountSeed squadMateSeed =
        accountSeeds.stream()
            .filter(seed -> !seed.owner())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Hub squad member seed is missing"));
    User owner = ensureAccount(ownerSeed);
    User squadMate = ensureAccount(squadMateSeed);

    Project project = ensureProject(owner);
    Workspace workspace = ensureWorkspace(owner);

    ensureProjectMember(project, owner, ProjectRoleType.LEADER);
    ensureProjectMember(project, squadMate, ProjectRoleType.FRONTEND);

    ensureWorkspaceMember(workspace, owner, "Product Lead");
    ensureWorkspaceMember(workspace, squadMate, "Frontend");

    seedMilestones(workspace, owner);
    seedTasks(workspace, owner, squadMate);
    seedCalendarEvents(workspace, owner, squadMate);
    seedDocs(workspace, owner);
    seedFiles(workspace, owner, squadMate);
    seedMeetingNotes(workspace, owner, squadMate);
    seedNotices(workspace);
    seedWorkspaceQna(workspace, owner, squadMate);
    seedActivityLogs(workspace, owner, squadMate);
  }

  private User ensureAccount(AccountSeed seed) {
    User user = ensureUser(seed.email(), seed.name(), seed.preserveExistingName());
    ensureProfile(user, seed.bio(), seed.channelName(), seed.githubUrl());
    return user;
  }

  private List<AccountSeed> accountSeeds() {
    return seedSqlExecutor.query(
        "db/local/learner-workspace/hub-squad-accounts.sql",
        (resultSet, rowNumber) ->
            new AccountSeed(
                resultSet.getString("email"),
                resultSet.getString("name"),
                resultSet.getBoolean("preserve_existing_name"),
                resultSet.getString("bio"),
                resultSet.getString("channel_name"),
                resultSet.getString("github_url"),
                resultSet.getBoolean("is_owner")));
  }

  private User ensureUser(String email, String name, boolean preserveExistingName) {
    return userRepository
        .findByEmail(email)
        .map(user -> restoreUser(user, name, preserveExistingName))
        .orElseGet(
            () ->
                userRepository.save(
                    User.builder()
                        .email(email)
                        .password(passwordEncoder.encode(SEED_PASSWORD))
                        .name(name)
                        .role(UserRole.ROLE_LEARNER)
                        .build()));
  }

  private User restoreUser(User user, String name, boolean preserveExistingName) {
    if (!preserveExistingName && !name.equals(user.getName())) {
      user.updateName(name);
    }
    if (!passwordEncoder.matches(SEED_PASSWORD, user.getPassword())) {
      user.changePassword(passwordEncoder.encode(SEED_PASSWORD));
    }
    if (!Boolean.TRUE.equals(user.getIsActive())
        || user.getAccountStatus() != AccountStatus.ACTIVE) {
      user.restore();
    }
    return user;
  }

  private void ensureProfile(User user, String bio, String channelName, String githubUrl) {
    userProfileRepository
        .findByUserId(user.getId())
        .ifPresentOrElse(
            profile ->
                profile.updateLearnerProfile(
                    bio, null, profile.getDisplayProfileImage(), channelName, githubUrl, null),
            () ->
                userProfileRepository.save(
                    UserProfile.builder()
                        .user(user)
                        .bio(bio)
                        .channelName(channelName)
                        .githubUrl(githubUrl)
                        .isPublic(true)
                        .build()));
  }

  private Project ensureProject(User owner) {
    Project project =
        projectRepository
            .findByNameAndOwnerIdAndIsDeletedFalse(PROJECT_NAME, owner.getId())
            .orElseGet(
                () ->
                    projectRepository.save(
                        Project.builder()
                            .ownerId(owner.getId())
                            .name(PROJECT_NAME)
                            .description(PROJECT_INTRO)
                            .intro(PROJECT_INTRO)
                            .projectType(ProjectType.SQUAD)
                            .status(ProjectStatus.IN_PROGRESS)
                            .visibility(ProjectVisibility.PUBLIC)
                            .recruitingStatus(ProjectRecruitingStatus.CLOSED)
                            .build()));

    project.updateProject(PROJECT_NAME, PROJECT_INTRO);
    project.updateIntro(PROJECT_INTRO);
    project.changeStatus(ProjectStatus.IN_PROGRESS);
    project.changeVisibility(ProjectVisibility.PUBLIC);
    project.changeRecruitingStatus(ProjectRecruitingStatus.CLOSED);
    return project;
  }

  private Workspace ensureWorkspace(User owner) {
    Workspace workspace =
        workspaceRepository
            .findByNameAndOwnerIdAndIsDeletedFalse(PROJECT_NAME, owner.getId())
            .orElseGet(
                () ->
                    workspaceRepository.save(
                        Workspace.builder()
                            .ownerId(owner.getId())
                            .name(PROJECT_NAME)
                            .description(PROJECT_INTRO)
                            .type(WorkspaceType.SQUAD)
                            .build()));

    workspace.updateSettings(PROJECT_NAME, PROJECT_INTRO);
    workspace.restore();
    return workspace;
  }

  private void ensureProjectMember(Project project, User user, ProjectRoleType roleType) {
    projectMemberRepository
        .findByProjectIdAndLearnerId(project.getId(), user.getId())
        .ifPresentOrElse(
            member -> {
              if (member.getRoleType() != roleType) {
                member.changeRole(roleType);
              }
            },
            () ->
                projectMemberRepository.save(
                    ProjectMember.builder()
                        .projectId(project.getId())
                        .learnerId(user.getId())
                        .roleType(roleType)
                        .build()));
  }

  private void ensureWorkspaceMember(Workspace workspace, User user, String positionLabel) {
    workspaceMemberRepository
        .findByWorkspaceIdAndLearnerId(workspace.getId(), user.getId())
        .ifPresentOrElse(
            member -> {
              member.assignPositionLabel(positionLabel);
              member.markActive(LocalDateTime.now().minusMinutes(8));
            },
            () -> {
              WorkspaceMember member =
                  WorkspaceMember.builder()
                      .workspaceId(workspace.getId())
                      .learnerId(user.getId())
                      .positionLabel(positionLabel)
                      .build();
              member.markActive(LocalDateTime.now().minusMinutes(8));
              workspaceMemberRepository.save(member);
            });
  }

  private void seedMilestones(Workspace workspace, User owner) {
    seedSqlExecutor
        .query(
            "db/local/learner-workspace/hub-squad-milestones.sql",
            (resultSet, rowNumber) ->
                new MilestoneSeed(
                    resultSet.getString("title"),
                    resultSet.getString("description"),
                    resultSet.getInt("start_offset_days"),
                    resultSet.getInt("due_offset_days"),
                    MilestoneStatus.valueOf(resultSet.getString("status"))))
        .forEach(
            seed ->
                ensureMilestone(
                    workspace,
                    owner,
                    seed.title(),
                    seed.description(),
                    LocalDate.now().plusDays(seed.startOffsetDays()),
                    LocalDate.now().plusDays(seed.dueOffsetDays()),
                    seed.status()));
  }

  private void ensureMilestone(
      Workspace workspace,
      User owner,
      String title,
      String description,
      LocalDate startDate,
      LocalDate dueDate,
      MilestoneStatus status) {
    boolean exists =
        milestoneRepository
            .findAllByWorkspaceIdAndIsDeletedFalseOrderByDueDateAsc(workspace.getId())
            .stream()
            .anyMatch(milestone -> title.equals(milestone.getTitle()));

    if (exists) {
      return;
    }

    milestoneRepository.save(
        Milestone.builder()
            .workspaceId(workspace.getId())
            .title(title)
            .description(description)
            .startDate(startDate)
            .dueDate(dueDate)
            .status(status)
            .createdById(owner.getId())
            .build());
  }

  private void seedTasks(Workspace workspace, User owner, User squadMate) {
    seedSqlExecutor
        .query(
            "db/local/learner-workspace/hub-squad-tasks.sql",
            (resultSet, rowNumber) ->
                new TaskSeed(
                    resultSet.getBoolean("assigned_to_owner"),
                    resultSet.getString("title"),
                    resultSet.getString("description"),
                    WorkspaceTaskStatus.valueOf(resultSet.getString("status")),
                    WorkspaceTaskPriority.valueOf(resultSet.getString("priority")),
                    resultSet.getInt("due_offset_days")))
        .forEach(
            seed ->
                ensureTask(
                    workspace,
                    owner,
                    seed.assignedToOwner() ? owner : squadMate,
                    seed.title(),
                    seed.description(),
                    seed.status(),
                    seed.priority(),
                    LocalDate.now().plusDays(seed.dueOffsetDays())));
  }

  private void ensureTask(
      Workspace workspace,
      User createdBy,
      User assignee,
      String title,
      String description,
      WorkspaceTaskStatus status,
      WorkspaceTaskPriority priority,
      LocalDate dueDate) {
    boolean exists =
        workspaceTaskRepository
            .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspace.getId())
            .stream()
            .anyMatch(task -> title.equals(task.getTitle()));

    if (exists) {
      return;
    }

    workspaceTaskRepository.save(
        WorkspaceTask.builder()
            .workspaceId(workspace.getId())
            .title(title)
            .description(description)
            .status(status)
            .priority(priority)
            .assigneeId(assignee.getId())
            .dueDate(dueDate)
            .createdById(createdBy.getId())
            .build());
  }

  private void seedCalendarEvents(Workspace workspace, User owner, User squadMate) {
    seedSqlExecutor
        .query(
            "db/local/learner-workspace/hub-squad-calendar-events.sql",
            (resultSet, rowNumber) ->
                new CalendarEventSeed(
                    resultSet.getBoolean("created_by_owner"),
                    resultSet.getString("title"),
                    resultSet.getString("description"),
                    resultSet.getInt("start_offset_days"),
                    resultSet.getObject("start_time", java.time.LocalTime.class),
                    resultSet.getInt("end_offset_days"),
                    resultSet.getObject("end_time", java.time.LocalTime.class)))
        .forEach(
            seed ->
                ensureCalendarEvent(
                    workspace,
                    seed.createdByOwner() ? owner : squadMate,
                    seed.title(),
                    seed.description(),
                    LocalDate.now().plusDays(seed.startOffsetDays()).atTime(seed.startTime()),
                    LocalDate.now().plusDays(seed.endOffsetDays()).atTime(seed.endTime())));
  }

  private void ensureCalendarEvent(
      Workspace workspace,
      User creator,
      String title,
      String description,
      LocalDateTime startAt,
      LocalDateTime endAt) {
    boolean exists =
        calendarEventRepository
            .findAllByWorkspaceIdAndIsDeletedFalseOrderByStartAtAsc(workspace.getId())
            .stream()
            .anyMatch(event -> title.equals(event.getTitle()));

    if (exists) {
      return;
    }

    calendarEventRepository.save(
        CalendarEvent.builder()
            .workspaceId(workspace.getId())
            .title(title)
            .description(description)
            .startAt(startAt)
            .endAt(endAt)
            .createdById(creator.getId())
            .build());
  }

  private void seedDocs(Workspace workspace, User owner) {
    seedSqlExecutor
        .query(
            "db/local/learner-workspace/hub-squad-docs.sql",
            (resultSet, rowNumber) ->
                new DocSeed(
                    WorkspaceDocType.valueOf(resultSet.getString("doc_type")),
                    resultSet.getString("content")))
        .forEach(seed -> upsertDoc(workspace, owner, seed.docType(), seed.content()));
  }

  private void upsertDoc(
      Workspace workspace, User owner, WorkspaceDocType docType, String content) {
    workspaceDocRepository
        .findByWorkspaceIdAndDocType(workspace.getId(), docType)
        .ifPresentOrElse(
            doc -> doc.update(content, owner.getId()),
            () ->
                workspaceDocRepository.save(
                    WorkspaceDoc.builder()
                        .workspaceId(workspace.getId())
                        .docType(docType)
                        .content(content)
                        .updatedById(owner.getId())
                        .build()));
  }

  private void seedFiles(Workspace workspace, User owner, User squadMate) {
    WorkspaceFile folder = ensureFolder(workspace, owner, "기획 자료");
    seedSqlExecutor
        .query(
            "db/local/learner-workspace/hub-squad-files.sql",
            (resultSet, rowNumber) ->
                new FileSeed(
                    resultSet.getBoolean("uploaded_by_owner"),
                    resultSet.getString("title"),
                    resultSet.getString("url")))
        .forEach(
            seed ->
                ensureLink(
                    workspace,
                    seed.uploadedByOwner() ? owner : squadMate,
                    folder.getId(),
                    seed.title(),
                    seed.url()));
  }

  private WorkspaceFile ensureFolder(Workspace workspace, User uploader, String name) {
    return workspaceFileRepository
        .findAllByWorkspaceIdAndParentIdIsNullAndIsDeletedFalseOrderByCreatedAtDesc(
            workspace.getId())
        .stream()
        .filter(file -> file.isFolder() && name.equals(file.getOriginalFileName()))
        .findFirst()
        .orElseGet(
            () ->
                workspaceFileRepository.save(
                    WorkspaceFile.builder()
                        .workspaceId(workspace.getId())
                        .parentId(null)
                        .itemType(WorkspaceFileType.FOLDER)
                        .originalFileName(name)
                        .storedFileName("")
                        .filePath("")
                        .fileSize(0)
                        .contentType(null)
                        .storageProvider("LOCAL")
                        .objectKey(null)
                        .uploadedById(uploader.getId())
                        .build()));
  }

  private void ensureLink(
      Workspace workspace, User uploader, Long parentId, String title, String url) {
    boolean exists =
        workspaceFileRepository
            .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspace.getId())
            .stream()
            .anyMatch(
                file ->
                    file.getItemType() == WorkspaceFileType.LINK
                        && title.equals(file.getOriginalFileName()));

    if (exists) {
      return;
    }

    workspaceFileRepository.save(
        WorkspaceFile.builder()
            .workspaceId(workspace.getId())
            .parentId(parentId)
            .itemType(WorkspaceFileType.LINK)
            .originalFileName(title)
            .storedFileName("")
            .filePath("")
            .fileSize(0)
            .contentType("text/uri-list")
            .storageProvider("LINK")
            .objectKey(url)
            .uploadedById(uploader.getId())
            .build());
  }

  private void seedMeetingNotes(Workspace workspace, User owner, User squadMate) {
    seedSqlExecutor
        .query(
            "db/local/learner-workspace/hub-squad-meeting-notes.sql",
            (resultSet, rowNumber) ->
                new MeetingNoteSeed(
                    resultSet.getBoolean("created_by_owner"),
                    resultSet.getString("title"),
                    resultSet.getString("content")))
        .forEach(
            seed ->
                ensureMeetingNote(
                    workspace,
                    seed.createdByOwner() ? owner : squadMate,
                    seed.title(),
                    seed.content()));
  }

  private void ensureMeetingNote(Workspace workspace, User creator, String title, String content) {
    boolean exists =
        meetingNoteRepository
            .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspace.getId())
            .stream()
            .anyMatch(note -> title.equals(note.getTitle()));

    if (exists) {
      return;
    }

    meetingNoteRepository.save(
        MeetingNote.builder()
            .workspaceId(workspace.getId())
            .title(title)
            .content(content)
            .createdById(creator.getId())
            .build());
  }

  private void seedNotices(Workspace workspace) {
    seedSqlExecutor
        .query(
            "db/local/learner-workspace/hub-squad-notices.sql",
            (resultSet, rowNumber) ->
                new NoticeSeed(resultSet.getString("title"), resultSet.getString("content")))
        .forEach(seed -> ensureNotice(workspace, seed.title(), seed.content()));
  }

  private void ensureNotice(Workspace workspace, String title, String content) {
    boolean exists =
        workspaceNoticeRepository
            .findByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspace.getId())
            .stream()
            .anyMatch(notice -> title.equals(notice.getTitle()));

    if (exists) {
      return;
    }

    workspaceNoticeRepository.save(
        WorkspaceNotice.builder()
            .workspaceId(workspace.getId())
            .title(title)
            .content(content)
            .build());
  }

  private void seedWorkspaceQna(Workspace workspace, User owner, User squadMate) {
    WorkspaceQnaSeed seed =
        seedSqlExecutor
            .query(
                "db/local/learner-workspace/hub-squad-qna.sql",
                (resultSet, rowNumber) ->
                    new WorkspaceQnaSeed(
                        QuestionTemplateType.valueOf(resultSet.getString("template_type")),
                        QuestionDifficulty.valueOf(resultSet.getString("difficulty")),
                        resultSet.getString("title"),
                        resultSet.getString("question_content"),
                        resultSet.getString("answer_content")))
            .stream()
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Hub squad Q&A seed is empty"));

    Question question =
        questionRepository
            .findAllByQuestionScopeAndWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
                QuestionScope.WORKSPACE, workspace.getId())
            .stream()
            .filter(item -> seed.title().equals(item.getTitle()))
            .findFirst()
            .orElseGet(
                () -> {
                  Question created =
                      Question.builder()
                          .user(squadMate)
                          .templateType(seed.templateType())
                          .difficulty(seed.difficulty())
                          .title(seed.title())
                          .content(seed.questionContent())
                          .build();
                  created.attachWorkspace(workspace.getId());
                  return questionRepository.save(created);
                });

    boolean hasAnswer =
        answerRepository
            .findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(question.getId())
            .stream()
            .anyMatch(answer -> answer.getUser().getId().equals(owner.getId()));

    if (!hasAnswer) {
      answerRepository.save(
          Answer.builder().question(question).user(owner).content(seed.answerContent()).build());
      question.markAsAnswered();
    }
  }

  private void seedActivityLogs(Workspace workspace, User owner, User squadMate) {
    seedSqlExecutor
        .query(
            "db/local/learner-workspace/hub-squad-activity-logs.sql",
            (resultSet, rowNumber) ->
                new ActivityLogSeed(
                    resultSet.getBoolean("acted_by_owner"),
                    ActivityLogType.valueOf(resultSet.getString("activity_type")),
                    resultSet.getString("description")))
        .forEach(
            seed ->
                ensureActivityLog(
                    workspace,
                    seed.actedByOwner() ? owner : squadMate,
                    seed.activityType(),
                    seed.description()));
  }

  private void ensureActivityLog(
      Workspace workspace, User actor, ActivityLogType activityType, String description) {
    boolean exists =
        activityLogRepository.findAllByWorkspaceIdOrderByCreatedAtDesc(workspace.getId()).stream()
            .anyMatch(log -> description.equals(log.getDescription()));

    if (exists) {
      return;
    }

    activityLogRepository.save(
        ActivityLog.builder()
            .workspaceId(workspace.getId())
            .actorId(actor.getId())
            .activityType(activityType)
            .description(description)
            .build());
  }

  private record MilestoneSeed(
      String title,
      String description,
      int startOffsetDays,
      int dueOffsetDays,
      MilestoneStatus status) {}

  private record TaskSeed(
      boolean assignedToOwner,
      String title,
      String description,
      WorkspaceTaskStatus status,
      WorkspaceTaskPriority priority,
      int dueOffsetDays) {}

  private record CalendarEventSeed(
      boolean createdByOwner,
      String title,
      String description,
      int startOffsetDays,
      java.time.LocalTime startTime,
      int endOffsetDays,
      java.time.LocalTime endTime) {}

  private record DocSeed(WorkspaceDocType docType, String content) {}

  private record FileSeed(boolean uploadedByOwner, String title, String url) {}

  private record MeetingNoteSeed(boolean createdByOwner, String title, String content) {}

  private record NoticeSeed(String title, String content) {}

  private record WorkspaceQnaSeed(
      QuestionTemplateType templateType,
      QuestionDifficulty difficulty,
      String title,
      String questionContent,
      String answerContent) {}

  private record ActivityLogSeed(
      boolean actedByOwner, ActivityLogType activityType, String description) {}

  private record AccountSeed(
      String email,
      String name,
      boolean preserveExistingName,
      String bio,
      String channelName,
      String githubUrl,
      boolean owner) {}
}

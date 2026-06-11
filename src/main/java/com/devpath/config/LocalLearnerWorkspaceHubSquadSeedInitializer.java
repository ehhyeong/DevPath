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

  private static final String OWNER_EMAIL = "learner@devpath.com";
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

  @Override
  @Transactional
  public void run(String... args) {
    User owner = ensureUser(OWNER_EMAIL, "이학습", true);
    User squadMate = ensureUser(EXTRA_MEMBER_EMAIL, "김학습", false);

    ensureProfile(
        owner,
        "로드맵 기반 학습 플랫폼을 기획하고 검증하는 학습자입니다.",
        "Learner DevPath",
        "https://github.com/ehhyeong/DevPath");
    ensureProfile(
        squadMate,
        "프론트엔드 UI와 학습 경험 개선을 맡은 스쿼드 멤버입니다.",
        "DevPath Squadmate",
        "https://github.com/devpath-squadmate");

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
    LocalDate today = LocalDate.now();
    ensureMilestone(
        workspace,
        owner,
        "MVP 범위 확정",
        "로드맵 탐색, 노드 상세, 학습 현황 카드까지 1차 MVP 범위를 잠급니다.",
        today.minusDays(8),
        today.minusDays(2),
        MilestoneStatus.DONE);
    ensureMilestone(
        workspace,
        owner,
        "로드맵 학습 플로우 구현",
        "로드맵 선택부터 노드별 학습 상태 저장까지 핵심 플로우를 연결합니다.",
        today.minusDays(1),
        today.plusDays(6),
        MilestoneStatus.IN_PROGRESS);
    ensureMilestone(
        workspace,
        owner,
        "대시보드와 회고 정리",
        "학습 진행률, 과제 제출 현황, 회고 문서를 묶어 데모 가능한 상태로 정리합니다.",
        today.plusDays(7),
        today.plusDays(14),
        MilestoneStatus.OPEN);
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
        milestoneRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByDueDateAsc(
                workspace.getId())
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
    LocalDate today = LocalDate.now();
    ensureTask(
        workspace,
        owner,
        owner,
        "로드맵 홈 MVP 와이어프레임 정리",
        "핵심 진입 화면, 추천 로드맵 카드, 최근 학습 영역의 우선순위를 정리합니다.",
        WorkspaceTaskStatus.DONE,
        WorkspaceTaskPriority.HIGH,
        today.minusDays(3));
    ensureTask(
        workspace,
        owner,
        squadMate,
        "학습 진행률 카드 컴포넌트 구현",
        "노드 완료율, 오늘 학습 시간, 다음 추천 노드를 카드 형태로 표시합니다.",
        WorkspaceTaskStatus.IN_PROGRESS,
        WorkspaceTaskPriority.HIGH,
        today.plusDays(2));
    ensureTask(
        workspace,
        owner,
        owner,
        "로드맵 노드 상세 API 응답 필드 정리",
        "노드 제목, 설명, 선행 조건, 연결 강의, 과제 상태 필드명을 정리합니다.",
        WorkspaceTaskStatus.IN_REVIEW,
        WorkspaceTaskPriority.MEDIUM,
        today.plusDays(3));
    ensureTask(
        workspace,
        owner,
        squadMate,
        "스쿼드 대시보드 빈 상태 문구 점검",
        "처음 접속한 팀원이 작업, 일정, 파일 영역을 이해할 수 있도록 빈 상태 문구를 점검합니다.",
        WorkspaceTaskStatus.TODO,
        WorkspaceTaskPriority.LOW,
        today.plusDays(5));
    ensureTask(
        workspace,
        owner,
        owner,
        "과제 제출 플로우 QA 체크리스트 작성",
        "파일 제출, URL 제출, 텍스트 제출 케이스와 실패 시나리오를 QA 체크리스트로 정리합니다.",
        WorkspaceTaskStatus.TODO,
        WorkspaceTaskPriority.MEDIUM,
        today.plusDays(7));
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
        workspaceTaskRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
                workspace.getId())
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
    LocalDate today = LocalDate.now();
    ensureCalendarEvent(
        workspace,
        owner,
        "로드맵 플로우 스탠드업",
        "이번 주 구현 범위와 API 의존성을 30분 안에 정리합니다.",
        today.plusDays(1).atTime(10, 30),
        today.plusDays(1).atTime(11, 0));
    ensureCalendarEvent(
        workspace,
        squadMate,
        "진행률 카드 UI 리뷰",
        "컴포넌트 상태, 빈 상태, 모바일 레이아웃을 함께 확인합니다.",
        today.plusDays(3).atTime(15, 0),
        today.plusDays(3).atTime(16, 0));
    ensureCalendarEvent(
        workspace,
        owner,
        "MVP 데모 리허설",
        "로드맵 선택부터 학습 대시보드까지 데모 동선을 리허설합니다.",
        today.plusDays(8).atTime(14, 0),
        today.plusDays(8).atTime(15, 0));
  }

  private void ensureCalendarEvent(
      Workspace workspace,
      User creator,
      String title,
      String description,
      LocalDateTime startAt,
      LocalDateTime endAt) {
    boolean exists =
        calendarEventRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByStartAtAsc(
                workspace.getId())
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
    upsertDoc(
        workspace,
        owner,
        WorkspaceDocType.API_SPEC,
        """
        # DevPath API 초안

        ## GET /api/roadmaps/recommended
        - 목적: 사용자 관심 태그 기반 추천 로드맵 목록 조회
        - 응답: roadmapId, title, summary, completionRate, nextNodeTitle

        ## GET /api/roadmaps/{roadmapId}/nodes
        - 목적: 로드맵 노드와 학습 상태 조회
        - 응답: nodeId, title, status, requiredTags, linkedCourseIds

        ## PATCH /api/learning/nodes/{nodeId}/status
        - 목적: 학습자가 노드 상태를 시작, 완료, 보류로 변경
        - 요청: status, memo
        """);
    upsertDoc(
        workspace,
        owner,
        WorkspaceDocType.ERD,
        """
        users
          └─ learning_progress
               ├─ roadmap_id
               └─ roadmap_node_id

        roadmaps
          └─ roadmap_nodes
               └─ course_node_mappings

        courses
          └─ course_sections
               └─ lessons
        """);
    upsertDoc(
        workspace,
        owner,
        WorkspaceDocType.INFRA,
        """
        - Frontend: React, Vite, workspace-hub 라우팅
        - Backend: Spring Boot, PostgreSQL
        - Storage: 로컬 개발 환경에서는 workspace file storage 사용
        - 배포 전 확인: API base URL, CORS, JWT 만료 정책
        """);
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
    ensureLink(
        workspace,
        owner,
        folder.getId(),
        "서비스 IA 초안",
        "https://www.figma.com/file/devpath-roadmap-ia");
    ensureLink(
        workspace,
        squadMate,
        folder.getId(),
        "로드맵 학습 플로우 메모",
        "https://www.notion.so/devpath-roadmap-flow");
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
        workspaceFileRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
                workspace.getId())
            .stream()
            .anyMatch(file -> file.getItemType() == WorkspaceFileType.LINK && title.equals(file.getOriginalFileName()));

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
    ensureMeetingNote(
        workspace,
        owner,
        "킥오프 회의록",
        """
        ## 결정 사항
        - 프로젝트 이름은 DevPath로 고정합니다.
        - MVP는 로드맵 탐색, 노드 상세, 학습 진행률 카드까지 포함합니다.
        - GitHub 코드 피드백은 실제 저장소 연결 후 확인합니다.

        ## 액션 아이템
        - learner: API 응답 필드 초안 정리
        - squadmate: 진행률 카드 UI 상태 정리
        """);
    ensureMeetingNote(
        workspace,
        squadMate,
        "진행률 카드 UI 리뷰 메모",
        """
        ## 확인 내용
        - 완료율은 퍼센트와 진행 바를 함께 노출합니다.
        - 다음 추천 노드는 빈 상태와 데이터 로딩 상태를 분리합니다.
        - 모바일에서는 카드가 1열로 쌓이도록 정리합니다.
        """);
  }

  private void ensureMeetingNote(
      Workspace workspace, User creator, String title, String content) {
    boolean exists =
        meetingNoteRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
                workspace.getId())
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
    ensureNotice(
        workspace,
        "이번 주 목표",
        "로드맵 상세 API 필드 확정과 학습 진행률 카드 1차 구현을 이번 주 목표로 잡습니다.");
    ensureNotice(
        workspace,
        "GitHub 연동 안내",
        "코드 피드백 영역은 실제 DevPath 저장소 연결 후 확인할 예정이므로 현재 시드에서는 제외합니다.");
  }

  private void ensureNotice(Workspace workspace, String title, String content) {
    boolean exists =
        workspaceNoticeRepository.findByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
                workspace.getId())
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
    Question question =
        questionRepository
            .findAllByQuestionScopeAndWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
                QuestionScope.WORKSPACE, workspace.getId())
            .stream()
            .filter(item -> "로드맵 노드 완료 기준을 어디까지 잡을까요?".equals(item.getTitle()))
            .findFirst()
            .orElseGet(
                () -> {
                  Question created =
                      Question.builder()
                          .user(squadMate)
                          .templateType(QuestionTemplateType.PROJECT)
                          .difficulty(QuestionDifficulty.MEDIUM)
                          .title("로드맵 노드 완료 기준을 어디까지 잡을까요?")
                          .content(
                              "노드 상세에서 강의 수강, 과제 제출, 퀴즈 통과 중 어떤 조건을 완료 기준으로 먼저 볼지 정해야 할 것 같습니다.")
                          .build();
                  created.attachWorkspace(workspace.getId());
                  return questionRepository.save(created);
                });

    boolean hasAnswer =
        answerRepository.findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(question.getId())
            .stream()
            .anyMatch(answer -> answer.getUser().getId().equals(owner.getId()));

    if (!hasAnswer) {
      answerRepository.save(
          Answer.builder()
              .question(question)
              .user(owner)
              .content(
                  "MVP에서는 강의 수강 완료와 과제 제출 여부를 먼저 완료 기준으로 두고, 퀴즈 통과 조건은 다음 스프린트에서 붙이는 방향이 좋겠습니다.")
              .build());
      question.markAsAnswered();
    }
  }

  private void seedActivityLogs(Workspace workspace, User owner, User squadMate) {
    ensureActivityLog(
        workspace,
        owner,
        ActivityLogType.MEMBER_JOINED,
        "learner@devpath.com님이 DevPath 스쿼드를 생성했습니다.");
    ensureActivityLog(
        workspace,
        squadMate,
        ActivityLogType.MEMBER_JOINED,
        "김학습님이 DevPath 스쿼드에 참여했습니다.");
    ensureActivityLog(
        workspace,
        owner,
        ActivityLogType.MILESTONE_CREATED,
        "MVP 범위 확정 마일스톤이 생성되었습니다.");
    ensureActivityLog(
        workspace,
        squadMate,
        ActivityLogType.TASK_CREATED,
        "학습 진행률 카드 컴포넌트 구현 작업이 등록되었습니다.");
    ensureActivityLog(
        workspace,
        owner,
        ActivityLogType.DOC_UPDATED,
        "DevPath API 초안 문서가 업데이트되었습니다.");
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
}

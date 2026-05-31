package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.mentoring.InstructorMentoringBoardPayload;
import com.devpath.api.instructor.entity.InstructorMentoringBoard;
import com.devpath.api.instructor.repository.InstructorMentoringBoardRepository;
import com.devpath.domain.mentoring.entity.MentoringApplication;
import com.devpath.domain.mentoring.entity.MentoringApplicationStatus;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import com.devpath.domain.mentoring.repository.MentoringApplicationRepository;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InstructorMentoringBoardServiceTest {

  @Mock private InstructorMentoringBoardRepository boardRepository;
  @Mock private UserRepository userRepository;
  @Mock private WorkspaceRepository workspaceRepository;
  @Mock private WorkspaceMemberRepository workspaceMemberRepository;
  @Mock private MilestoneRepository milestoneRepository;
  @Mock private WorkspaceTaskRepository workspaceTaskRepository;
  @Mock private MentoringApplicationRepository mentoringApplicationRepository;
  @Mock private MentoringPostRepository mentoringPostRepository;

  private InstructorMentoringBoardService service;

  @BeforeEach
  void setUp() {
    service =
        new InstructorMentoringBoardService(
            boardRepository,
            userRepository,
            workspaceRepository,
            workspaceMemberRepository,
            milestoneRepository,
            workspaceTaskRepository,
            mentoringApplicationRepository,
            mentoringPostRepository,
            Optional.of(new ObjectMapper().findAndRegisterModules()));
  }

  @Test
  void saveBoardCreatesStudyWorkspaceWithApprovedMembersAndWeeklyTasks() {
    long instructorId = 1L;
    MentoringPost post = mentoringPost(10L, instructorId, "Backend Mentoring", "study");
    MentoringApplication application = approvedApplication(post, 2L, "Backend");
    givenWorkspaceCreation(instructorId, 99L);
    when(mentoringPostRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(post));
    when(mentoringApplicationRepository.findAllByPost_IdAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
            10L, MentoringApplicationStatus.APPROVED))
        .thenReturn(List.of(application));

    InstructorMentoringBoardPayload result =
        service.saveBoard(
            instructorId,
            new InstructorMentoringBoardPayload(
                List.of(),
                List.of(),
                List.of(ongoingProject("post-10", "study", "2026-06-01"))));

    assertThat(result.ongoingProjects()).hasSize(1);
    assertThat(result.ongoingProjects().getFirst().workspaceId()).isEqualTo(99L);
    assertThat(post.getStatus()).isEqualTo(MentoringPostStatus.CLOSED);

    ArgumentCaptor<WorkspaceMember> memberCaptor = ArgumentCaptor.forClass(WorkspaceMember.class);
    verify(workspaceMemberRepository, times(2)).save(memberCaptor.capture());
    assertThat(memberCaptor.getAllValues())
        .extracting(WorkspaceMember::getLearnerId)
        .containsExactly(instructorId, 2L);

    ArgumentCaptor<WorkspaceTask> taskCaptor = ArgumentCaptor.forClass(WorkspaceTask.class);
    verify(workspaceTaskRepository, times(2)).save(taskCaptor.capture());
    assertThat(taskCaptor.getAllValues())
        .extracting(WorkspaceTask::getTitle)
        .containsExactly("1주차 - ERD 설계", "2주차 - API 구현");
    assertThat(taskCaptor.getAllValues())
        .extracting(WorkspaceTask::getDueDate)
        .containsExactly(LocalDate.of(2026, 6, 7), LocalDate.of(2026, 6, 14));
  }

  @Test
  void saveBoardCreatesTeamWorkspaceWithWeeklyMilestones() {
    long instructorId = 1L;
    MentoringPost post = mentoringPost(11L, instructorId, "Team Mentoring", "team");
    givenWorkspaceCreation(instructorId, 100L);
    when(mentoringPostRepository.findByIdAndIsDeletedFalse(11L)).thenReturn(Optional.of(post));

    service.saveBoard(
        instructorId,
        new InstructorMentoringBoardPayload(
            List.of(), List.of(), List.of(ongoingProject("post-11", "team", "2026-06-01"))));

    ArgumentCaptor<Milestone> milestoneCaptor = ArgumentCaptor.forClass(Milestone.class);
    verify(milestoneRepository, times(2)).save(milestoneCaptor.capture());
    assertThat(milestoneCaptor.getAllValues())
        .extracting(Milestone::getTitle)
        .containsExactly("1주차 - ERD 설계", "2주차 - API 구현");
  }

  @Test
  void saveBoardSyncsApprovedMembersWhenWorkspaceAlreadyExists() {
    long instructorId = 1L;
    long workspaceId = 99L;
    MentoringPost post = mentoringPost(10L, instructorId, "Backend Mentoring", "study");
    MentoringApplication application = approvedApplication(post, 2L, "Backend");
    Workspace workspace =
        Workspace.builder()
            .ownerId(instructorId)
            .name("Backend Mentoring")
            .type(WorkspaceType.MENTORING)
            .build();
    ReflectionTestUtils.setField(workspace, "id", workspaceId);

    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(boardRepository.findByInstructorId(instructorId)).thenReturn(Optional.empty());
    when(boardRepository.save(any(InstructorMentoringBoard.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(workspaceRepository.findAllByOwnerIdAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId, WorkspaceType.MENTORING))
        .thenReturn(List.of(workspace));
    when(mentoringPostRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(post));
    when(mentoringApplicationRepository.findAllByPost_IdAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
            10L, MentoringApplicationStatus.APPROVED))
        .thenReturn(List.of(application));
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(anyLong(), anyLong()))
        .thenReturn(false);

    service.saveBoard(
        instructorId,
        new InstructorMentoringBoardPayload(
            List.of(),
            List.of(),
            List.of(
                ongoingProject(
                    "post-10-workspace-99",
                    "study",
                    "2026-06-01",
                    workspaceId,
                    "Backend Mentoring"))));

    ArgumentCaptor<WorkspaceMember> memberCaptor = ArgumentCaptor.forClass(WorkspaceMember.class);
    verify(workspaceMemberRepository, times(2)).save(memberCaptor.capture());
    assertThat(memberCaptor.getAllValues())
        .extracting(WorkspaceMember::getLearnerId)
        .containsExactly(instructorId, 2L);
  }

  @Test
  void saveBoardDoesNotReuseUnrelatedNextWorkspaceForLiveTeamPost() {
    long instructorId = 1L;
    long oldWorkspaceId = 50L;
    long newWorkspaceId = 99L;
    MentoringPost post = mentoringPost(12L, instructorId, "React 협업 플랫폼 구축", "team");
    Workspace oldWorkspace =
        Workspace.builder()
            .ownerId(instructorId)
            .name("Next.js 블로그 플랫폼 구축")
            .type(WorkspaceType.MENTORING)
            .build();
    ReflectionTestUtils.setField(oldWorkspace, "id", oldWorkspaceId);

    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(boardRepository.findByInstructorId(instructorId)).thenReturn(Optional.empty());
    when(boardRepository.save(any(InstructorMentoringBoard.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(workspaceRepository.findAllByOwnerIdAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId, WorkspaceType.MENTORING))
        .thenReturn(List.of(oldWorkspace));
    when(workspaceRepository.save(any(Workspace.class)))
        .thenAnswer(
            invocation -> {
              Workspace workspace = invocation.getArgument(0);
              ReflectionTestUtils.setField(workspace, "id", newWorkspaceId);
              return workspace;
            });
    when(mentoringPostRepository.findByIdAndIsDeletedFalse(12L)).thenReturn(Optional.of(post));
    when(mentoringApplicationRepository.findAllByPost_IdAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
            anyLong(), any(MentoringApplicationStatus.class)))
        .thenReturn(List.of());
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(anyLong(), anyLong()))
        .thenReturn(false);

    InstructorMentoringBoardPayload result =
        service.saveBoard(
            instructorId,
            new InstructorMentoringBoardPayload(
                List.of(),
                List.of(),
                List.of(
                    ongoingProject(
                        "post-12", "team", "2026-06-01", null, "React 협업 플랫폼 구축"))));

    assertThat(result.ongoingProjects()).hasSize(1);
    assertThat(result.ongoingProjects().getFirst().workspaceId()).isEqualTo(newWorkspaceId);
    assertThat(result.ongoingProjects().getFirst().id()).isEqualTo("post-12-workspace-99");

    ArgumentCaptor<WorkspaceMember> memberCaptor = ArgumentCaptor.forClass(WorkspaceMember.class);
    verify(workspaceMemberRepository).save(memberCaptor.capture());
    assertThat(memberCaptor.getValue().getWorkspaceId()).isEqualTo(newWorkspaceId);
  }

  @Test
  void saveBoardCreatesFreshWorkspaceForLivePostEvenWhenSameTitleWorkspaceExists() {
    long instructorId = 1L;
    long oldWorkspaceId = 5L;
    long newWorkspaceId = 99L;
    MentoringPost post = mentoringPost(12L, instructorId, "React 협업 플랫폼 구축", "team");
    Workspace oldWorkspace =
        Workspace.builder()
            .ownerId(instructorId)
            .name("React 협업 플랫폼 구축")
            .type(WorkspaceType.MENTORING)
            .build();
    ReflectionTestUtils.setField(oldWorkspace, "id", oldWorkspaceId);

    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(boardRepository.findByInstructorId(instructorId)).thenReturn(Optional.empty());
    when(boardRepository.save(any(InstructorMentoringBoard.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(workspaceRepository.findAllByOwnerIdAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId, WorkspaceType.MENTORING))
        .thenReturn(List.of(oldWorkspace));
    when(workspaceRepository.save(any(Workspace.class)))
        .thenAnswer(
            invocation -> {
              Workspace workspace = invocation.getArgument(0);
              ReflectionTestUtils.setField(workspace, "id", newWorkspaceId);
              return workspace;
            });
    when(mentoringPostRepository.findByIdAndIsDeletedFalse(12L)).thenReturn(Optional.of(post));
    when(mentoringApplicationRepository.findAllByPost_IdAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
            anyLong(), any(MentoringApplicationStatus.class)))
        .thenReturn(List.of());
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(anyLong(), anyLong()))
        .thenReturn(false);

    InstructorMentoringBoardPayload result =
        service.saveBoard(
            instructorId,
            new InstructorMentoringBoardPayload(
                List.of(),
                List.of(),
                List.of(
                    ongoingProject(
                        "post-12",
                        "team",
                        "2026-06-01",
                        oldWorkspaceId,
                        "React 협업 플랫폼 구축"),
                    ongoingProject(
                        "ongoing-workspace-5",
                        "team",
                        null,
                        oldWorkspaceId,
                        "React 협업 플랫폼 구축"))));

    assertThat(result.ongoingProjects()).hasSize(1);
    assertThat(result.ongoingProjects().getFirst().workspaceId()).isEqualTo(newWorkspaceId);
    assertThat(result.ongoingProjects().getFirst().id()).isEqualTo("post-12-workspace-99");
  }

  @Test
  void saveBoardCreatesWorkspaceForStartedLegacyOngoingWhenStoredWorkspaceDoesNotMatch() {
    long instructorId = 1L;
    long oldWorkspaceId = 5L;
    long newWorkspaceId = 99L;
    Workspace oldWorkspace =
        Workspace.builder()
            .ownerId(instructorId)
            .name("Next.js 블로그 플랫폼 구축")
            .type(WorkspaceType.MENTORING)
            .build();
    ReflectionTestUtils.setField(oldWorkspace, "id", oldWorkspaceId);

    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(boardRepository.findByInstructorId(instructorId)).thenReturn(Optional.empty());
    when(boardRepository.save(any(InstructorMentoringBoard.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(workspaceRepository.findAllByOwnerIdAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId, WorkspaceType.MENTORING))
        .thenReturn(List.of(oldWorkspace));
    when(workspaceRepository.save(any(Workspace.class)))
        .thenAnswer(
            invocation -> {
              Workspace workspace = invocation.getArgument(0);
              ReflectionTestUtils.setField(workspace, "id", newWorkspaceId);
              return workspace;
            });
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(anyLong(), anyLong()))
        .thenReturn(false);

    InstructorMentoringBoardPayload result =
        service.saveBoard(
            instructorId,
            new InstructorMentoringBoardPayload(
                List.of(),
                List.of(),
                List.of(
                    ongoingProject(
                        "travel",
                        "team",
                        "2026-06-01",
                        oldWorkspaceId,
                        "대용량 이커머스 서버 구축"))));

    assertThat(result.ongoingProjects()).hasSize(1);
    assertThat(result.ongoingProjects().getFirst().workspaceId()).isEqualTo(newWorkspaceId);
    assertThat(result.ongoingProjects().getFirst().id()).isEqualTo("travel");
  }

  @Test
  void getBoardRepairsLivePostItemPointingToUnrelatedWorkspace() throws Exception {
    long instructorId = 1L;
    long oldWorkspaceId = 50L;
    long newWorkspaceId = 99L;
    MentoringPost post = mentoringPost(12L, instructorId, "React 협업 플랫폼 구축", "team");
    Workspace oldWorkspace =
        Workspace.builder()
            .ownerId(instructorId)
            .name("Next.js 블로그 플랫폼 구축")
            .type(WorkspaceType.MENTORING)
            .build();
    ReflectionTestUtils.setField(oldWorkspace, "id", oldWorkspaceId);
    InstructorMentoringBoardPayload storedPayload =
        new InstructorMentoringBoardPayload(
            List.of(),
            List.of(),
            List.of(
                ongoingProject(
                    "post-12",
                    "team",
                    "2026-06-01",
                    oldWorkspaceId,
                    "React 협업 플랫폼 구축")));
    InstructorMentoringBoard board =
        new InstructorMentoringBoard(
            instructorId, new ObjectMapper().writeValueAsString(storedPayload));

    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(boardRepository.findByInstructorId(instructorId)).thenReturn(Optional.of(board));
    when(workspaceRepository.findAllByOwnerIdAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId, WorkspaceType.MENTORING))
        .thenReturn(List.of(oldWorkspace));
    when(workspaceRepository.save(any(Workspace.class)))
        .thenAnswer(
            invocation -> {
              Workspace workspace = invocation.getArgument(0);
              ReflectionTestUtils.setField(workspace, "id", newWorkspaceId);
              return workspace;
            });
    when(mentoringPostRepository.findByIdAndIsDeletedFalse(12L)).thenReturn(Optional.of(post));
    when(mentoringPostRepository.findAllByMentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId))
        .thenReturn(List.of());
    when(mentoringApplicationRepository.findAllByPost_IdAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
            anyLong(), any(MentoringApplicationStatus.class)))
        .thenReturn(List.of());
    when(mentoringApplicationRepository
            .findAllByPost_Mentor_IdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
                instructorId, MentoringApplicationStatus.PENDING))
        .thenReturn(List.of());
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(anyLong(), anyLong()))
        .thenReturn(false);

    InstructorMentoringBoardPayload result = service.getBoard(instructorId);

    assertThat(result.ongoingProjects()).hasSize(1);
    assertThat(result.ongoingProjects().getFirst().workspaceId()).isEqualTo(newWorkspaceId);
    assertThat(result.ongoingProjects().getFirst().id()).isEqualTo("post-12-workspace-99");

    verify(boardRepository).save(board);
    InstructorMentoringBoardPayload savedPayload =
        new ObjectMapper().readValue(board.getPayloadJson(), InstructorMentoringBoardPayload.class);
    assertThat(savedPayload.ongoingProjects().getFirst().workspaceId()).isEqualTo(newWorkspaceId);
    assertThat(savedPayload.ongoingProjects().getFirst().id()).isEqualTo("post-12-workspace-99");
  }

  private void givenWorkspaceCreation(long instructorId, long workspaceId) {
    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(boardRepository.findByInstructorId(instructorId)).thenReturn(Optional.empty());
    when(boardRepository.save(any(InstructorMentoringBoard.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(workspaceRepository.findAllByOwnerIdAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId, WorkspaceType.MENTORING))
        .thenReturn(List.of());
    when(workspaceRepository.save(any(Workspace.class)))
        .thenAnswer(
            invocation -> {
              Workspace workspace = invocation.getArgument(0);
              ReflectionTestUtils.setField(workspace, "id", workspaceId);
              return workspace;
            });
    when(mentoringApplicationRepository.findAllByPost_IdAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
            anyLong(), any(MentoringApplicationStatus.class)))
        .thenReturn(List.of());
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(anyLong(), anyLong()))
        .thenReturn(false);
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem ongoingProject(
      String id, String mode, String startDate) {
    return ongoingProject(id, mode, startDate, null);
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem ongoingProject(
      String id, String mode, String startDate, Long workspaceId) {
    return ongoingProject(id, mode, startDate, workspaceId, "Mentoring");
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem ongoingProject(
      String id, String mode, String startDate, Long workspaceId, String title) {
    return new InstructorMentoringBoardPayload.OngoingProjectItem(
        id,
        title,
        "Orientation",
        1,
        mode,
        "Backend",
        0,
        "Open workspace",
        "Schedule",
        List.of(),
        workspaceId,
        startDate);
  }

  private MentoringPost mentoringPost(Long postId, Long mentorId, String title, String mode) {
    User mentor =
        User.builder()
            .email("mentor" + mentorId + "@example.com")
            .password("encoded")
            .name("Mentor")
            .build();
    ReflectionTestUtils.setField(mentor, "id", mentorId);
    MentoringPost post =
        MentoringPost.builder()
            .mentor(mentor)
            .title(title)
            .content("content")
            .mentoringType(mode)
            .durationWeeks(2)
            .curriculum("ERD 설계\nAPI 구현")
            .maxParticipants(4)
            .build();
    ReflectionTestUtils.setField(post, "id", postId);
    return post;
  }

  private MentoringApplication approvedApplication(
      MentoringPost post, Long applicantId, String desiredPosition) {
    User applicant =
        User.builder()
            .email("learner" + applicantId + "@example.com")
            .password("encoded")
            .name("Learner")
            .build();
    ReflectionTestUtils.setField(applicant, "id", applicantId);
    MentoringApplication application =
        MentoringApplication.builder()
            .post(post)
            .applicant(applicant)
            .message("message")
            .desiredPosition(desiredPosition)
            .build();
    application.approve();
    return application;
  }
}

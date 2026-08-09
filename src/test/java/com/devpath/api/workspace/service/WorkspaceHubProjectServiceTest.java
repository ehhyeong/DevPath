package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteAcceptResponse;
import com.devpath.api.workspace.dto.WorkspaceInviteLinkResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.project.entity.ProjectType;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.ActivityLog;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.ActivityLogRepository;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
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
class WorkspaceHubProjectServiceTest {

  @Mock private WorkspaceMemberRepository workspaceMemberRepository;
  @Mock private WorkspaceRepository workspaceRepository;
  @Mock private WorkspaceTaskRepository workspaceTaskRepository;
  @Mock private MilestoneRepository milestoneRepository;
  @Mock private CalendarEventRepository calendarEventRepository;
  @Mock private ProjectRepository projectRepository;
  @Mock private ProjectMemberRepository projectMemberRepository;
  @Mock private MentoringRepository mentoringRepository;
  @Mock private UserRepository userRepository;
  @Mock private UserProfileRepository userProfileRepository;
  @Mock private ActivityLogRepository activityLogRepository;

  private WorkspaceHubProjectService service;

  @BeforeEach
  void setUp() {
    WorkspaceMembershipService membershipService =
        new WorkspaceMembershipService(
            workspaceMemberRepository,
            workspaceRepository,
            projectRepository,
            projectMemberRepository,
            activityLogRepository,
            new WorkspaceInviteTokenCodec());
    service =
        new WorkspaceHubProjectService(
            workspaceMemberRepository,
            workspaceRepository,
            workspaceTaskRepository,
            milestoneRepository,
            calendarEventRepository,
            mentoringRepository,
            userRepository,
            userProfileRepository,
            membershipService,
            new WorkspaceHubProgressCalculator(),
            new WorkspaceHubRoleResolver());
  }

  @Test
  void ownerCreatesInviteAndNewMemberAcceptsIt() {
    long workspaceId = 10L;
    long ownerId = 1L;
    long learnerId = 2L;
    Workspace workspace = workspace(workspaceId, ownerId);
    when(workspaceRepository.findByIdAndIsDeletedFalse(workspaceId))
        .thenReturn(Optional.of(workspace));
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, learnerId))
        .thenReturn(false);

    WorkspaceInviteLinkResponse link = service.createInviteLink(workspaceId, ownerId);
    WorkspaceInviteAcceptResponse result = service.acceptInvite(link.token(), learnerId);

    assertThat(link.workspaceId()).isEqualTo(workspaceId);
    assertThat(link.token()).isNotBlank();
    assertThat(result.workspaceId()).isEqualTo(workspaceId);
    assertThat(result.alreadyMember()).isFalse();

    ArgumentCaptor<WorkspaceMember> memberCaptor = ArgumentCaptor.forClass(WorkspaceMember.class);
    verify(workspaceMemberRepository).save(memberCaptor.capture());
    assertThat(memberCaptor.getValue().getWorkspaceId()).isEqualTo(workspaceId);
    assertThat(memberCaptor.getValue().getLearnerId()).isEqualTo(learnerId);
    verify(activityLogRepository).save(any(ActivityLog.class));
  }

  @Test
  void acceptInviteRejectsTamperedSignature() {
    Workspace workspace = workspace(10L, 1L);
    when(workspaceRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(workspace));
    WorkspaceInviteLinkResponse link = service.createInviteLink(10L, 1L);
    String tamperedToken = link.token().substring(0, link.token().length() - 1) + "x";

    assertThatThrownBy(() -> service.acceptInvite(tamperedToken, 2L))
        .isInstanceOf(CustomException.class);
    verify(workspaceMemberRepository, never()).save(any(WorkspaceMember.class));
  }

  @Test
  void memberLeavesProjectAndActivityIsRecorded() {
    long workspaceId = 10L;
    long learnerId = 2L;
    Workspace workspace = workspace(workspaceId, 1L);
    WorkspaceMember member =
        WorkspaceMember.builder().workspaceId(workspaceId).learnerId(learnerId).build();
    when(workspaceRepository.findByIdAndIsDeletedFalse(workspaceId))
        .thenReturn(Optional.of(workspace));
    when(projectRepository.findAllByNameAndProjectTypeAndIsDeletedFalse(
            "Backend Squad", ProjectType.SQUAD))
        .thenReturn(List.of());
    when(workspaceMemberRepository.findByWorkspaceIdAndLearnerId(workspaceId, learnerId))
        .thenReturn(Optional.of(member));

    service.leaveProject(workspaceId, learnerId);

    verify(workspaceMemberRepository).delete(member);
    verify(activityLogRepository).save(any(ActivityLog.class));
  }

  @Test
  void getProjectsCalculatesTaskProgressAndUsesMemberPosition() {
    long workspaceId = 10L;
    long learnerId = 2L;
    Workspace workspace = workspace(workspaceId, 1L, WorkspaceType.SOLO);
    WorkspaceMember member =
        WorkspaceMember.builder()
            .workspaceId(workspaceId)
            .learnerId(learnerId)
            .positionLabel("Backend")
            .build();
    WorkspaceTask doneTask = task(workspaceId, 1L, WorkspaceTaskStatus.DONE);
    WorkspaceTask todoTask = task(workspaceId, 2L, WorkspaceTaskStatus.TODO);

    when(workspaceMemberRepository.findAllByLearnerId(learnerId)).thenReturn(List.of(member));
    when(workspaceRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(
            List.of(workspaceId)))
        .thenReturn(List.of(workspace));
    when(workspaceMemberRepository.findAllByWorkspaceIdIn(List.of(workspaceId)))
        .thenReturn(List.of(member));
    when(workspaceTaskRepository
            .findAllByWorkspaceIdInAndAssigneeIdAndIsDeletedFalseOrderByUpdatedAtDesc(
                List.of(workspaceId), learnerId))
        .thenReturn(List.of(doneTask, todoTask));
    when(workspaceTaskRepository.findAllByWorkspaceIdInAndIsDeletedFalseOrderByUpdatedAtDesc(
            List.of(workspaceId)))
        .thenReturn(List.of(doneTask, todoTask));
    when(milestoneRepository.findAllByWorkspaceIdInAndIsDeletedFalseOrderByDueDateAsc(
            List.of(workspaceId)))
        .thenReturn(List.of());
    when(mentoringRepository.findAllByMentee_IdAndIsDeletedFalseOrderByCreatedAtDesc(learnerId))
        .thenReturn(List.of());
    when(mentoringRepository.findAllByMentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(learnerId))
        .thenReturn(List.of());
    when(userProfileRepository.findAllByUserIdIn(any())).thenReturn(List.of());
    when(calendarEventRepository
            .findAllByWorkspaceIdInAndStartAtGreaterThanEqualAndIsDeletedFalseOrderByStartAtAsc(
                any(), any()))
        .thenReturn(List.of());

    List<WorkspaceHubProjectResponse> result = service.getProjects(learnerId);

    assertThat(result).hasSize(1);
    assertThat(result.getFirst().getProgressPercent()).isEqualTo(50);
    assertThat(result.getFirst().getRoleLabel()).isEqualTo("BE");
  }

  private Workspace workspace(Long workspaceId, Long ownerId) {
    return workspace(workspaceId, ownerId, WorkspaceType.SQUAD);
  }

  private Workspace workspace(Long workspaceId, Long ownerId, WorkspaceType type) {
    Workspace workspace =
        Workspace.builder().ownerId(ownerId).name("Backend Squad").type(type).build();
    ReflectionTestUtils.setField(workspace, "id", workspaceId);
    return workspace;
  }

  private WorkspaceTask task(Long workspaceId, Long taskId, WorkspaceTaskStatus status) {
    return WorkspaceTask.builder()
        .id(taskId)
        .workspaceId(workspaceId)
        .title("Task " + taskId)
        .status(status)
        .createdById(1L)
        .build();
  }
}

package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.UpdateWorkspaceDocRequest;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.ActivityLog;
import com.devpath.domain.workspace.entity.ActivityLogType;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceDoc;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.ActivityLogRepository;
import com.devpath.domain.workspace.repository.MeetingNoteRepository;
import com.devpath.domain.workspace.repository.WorkspaceDocRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspaceDocServiceTest {

  @Mock private WorkspaceDocRepository workspaceDocRepository;
  @Mock private MeetingNoteRepository meetingNoteRepository;
  @Mock private WorkspaceRepository workspaceRepository;
  @Mock private WorkspaceMemberRepository workspaceMemberRepository;
  @Mock private ActivityLogRepository activityLogRepository;
  @Mock private UserRepository userRepository;
  @Mock private TeamWorkspaceHeaderNotificationService headerNotificationService;

  private WorkspaceDocService workspaceDocService;

  @BeforeEach
  void setUp() {
    workspaceDocService =
        new WorkspaceDocService(
            workspaceDocRepository,
            meetingNoteRepository,
            workspaceRepository,
            workspaceMemberRepository,
            activityLogRepository,
            userRepository,
            headerNotificationService);
  }

  @Test
  void getDocReturnsNullWhenWorkspaceDocDoesNotExist() {
    long workspaceId = 12L;
    long userId = 7L;
    givenWorkspaceMember(workspaceId, userId);
    when(workspaceDocRepository.findByWorkspaceIdAndDocType(workspaceId, WorkspaceDocType.ERD))
        .thenReturn(Optional.empty());

    assertThat(workspaceDocService.getDoc(workspaceId, userId, WorkspaceDocType.ERD)).isNull();
  }

  @Test
  void upsertDocRecordsActivityAndHeaderNotificationWithActorName() {
    long workspaceId = 12L;
    long userId = 7L;
    UpdateWorkspaceDocRequest request = new UpdateWorkspaceDocRequest();
    ReflectionTestUtils.setField(request, "content", "# API");
    givenWorkspaceMember(workspaceId, userId);
    when(workspaceDocRepository.findByWorkspaceIdAndDocType(
            workspaceId, WorkspaceDocType.API_SPEC))
        .thenReturn(Optional.empty());
    when(workspaceDocRepository.save(any(WorkspaceDoc.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(userRepository.findById(userId))
        .thenReturn(
            Optional.of(
                User.builder()
                    .email("lee@example.com")
                    .password("encoded")
                    .name("이하늘")
                    .build()));

    workspaceDocService.upsertDoc(workspaceId, userId, WorkspaceDocType.API_SPEC, request);

    ArgumentCaptor<ActivityLog> logCaptor = ArgumentCaptor.forClass(ActivityLog.class);
    verify(activityLogRepository).save(logCaptor.capture());
    assertThat(logCaptor.getValue().getWorkspaceId()).isEqualTo(workspaceId);
    assertThat(logCaptor.getValue().getActorId()).isEqualTo(userId);
    assertThat(logCaptor.getValue().getActivityType()).isEqualTo(ActivityLogType.DOC_UPDATED);
    assertThat(logCaptor.getValue().getDescription())
        .isEqualTo("이하늘님이 [API 명세서]를 업데이트했습니다.");
    verify(headerNotificationService)
        .addNotification(
            workspaceId,
            "architecture",
            "이하늘님이 [API 명세서]를 업데이트했습니다.",
            "/team-ws-architecture");
  }

  private void givenWorkspaceMember(long workspaceId, long userId) {
    when(workspaceRepository.findByIdAndIsDeletedFalse(workspaceId))
        .thenReturn(
            Optional.of(
                Workspace.builder()
                    .ownerId(userId)
                    .name("team")
                    .type(WorkspaceType.SQUAD)
                    .build()));
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId))
        .thenReturn(true);
  }
}

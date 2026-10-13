package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceAiAction;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceAiChatActionStatus;
import com.devpath.domain.workspace.repository.WorkspaceAiChatMessageRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceAiChatServiceTest {

  private final WorkspaceAiChatMessageRepository messages =
      mock(WorkspaceAiChatMessageRepository.class);
  private final WorkspaceRepository workspaces = mock(WorkspaceRepository.class);
  private final WorkspaceMemberRepository members = mock(WorkspaceMemberRepository.class);
  private final WorkspaceAiAssistService assistService = mock(WorkspaceAiAssistService.class);
  private final WorkspaceAiActionService actionService = mock(WorkspaceAiActionService.class);
  private final WorkspaceAiChatService service =
      new WorkspaceAiChatService(
          messages,
          workspaces,
          members,
          mock(UserRepository.class),
          assistService,
          actionService,
          new ObjectMapper());

  @BeforeEach
  void setUp() {
    when(workspaces.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(mock(Workspace.class)));
    when(members.existsByWorkspaceIdAndLearnerId(1L, 30L)).thenReturn(true);
  }

  @Test
  void alreadyExecutedProposalIsRejectedWithoutRunningActions() {
    when(messages.changeActionStatus(
            10L, 1L, WorkspaceAiChatActionStatus.PENDING, WorkspaceAiChatActionStatus.EXECUTED))
        .thenReturn(0);

    assertThatThrownBy(
            () -> service.executeActions(1L, 30L, 10L, List.of(WorkspaceAiAction.builder().build())))
        .isInstanceOf(CustomException.class)
        .satisfies(
            exception ->
                assertThat(((CustomException) exception).getErrorCode())
                    .isEqualTo(ErrorCode.WORKSPACE_AI_CHAT_ACTION_UNAVAILABLE));
    verifyNoInteractions(actionService);
    verify(messages, never()).save(any());
  }

  @Test
  void nonMemberCannotReadOrClearTeamChat() {
    assertThatThrownBy(() -> service.getMessages(1L, 99L))
        .isInstanceOf(CustomException.class)
        .satisfies(
            exception ->
                assertThat(((CustomException) exception).getErrorCode())
                    .isEqualTo(ErrorCode.WORKSPACE_FORBIDDEN));
    assertThatThrownBy(() -> service.clearMessages(1L, 99L)).isInstanceOf(CustomException.class);
    verify(messages, never()).softDeleteAllByWorkspaceId(any());
  }

  @Test
  void nonMemberCannotAskWithoutCallingAi() {
    assertThatThrownBy(() -> service.ask(1L, 99L, null)).isInstanceOf(CustomException.class);
    verifyNoInteractions(assistService);
  }
}

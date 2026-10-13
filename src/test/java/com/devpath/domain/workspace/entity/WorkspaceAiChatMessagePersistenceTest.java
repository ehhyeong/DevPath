package com.devpath.domain.workspace.entity;

import static org.assertj.core.api.Assertions.*;

import com.devpath.domain.workspace.repository.WorkspaceAiChatMessageRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WorkspaceAiChatMessagePersistenceTest {
  @Autowired WorkspaceAiChatMessageRepository messages;

  @Test
  void pendingActionCanBeMarkedExecutedOnlyOnce() {
    var answer = messages.saveAndFlush(WorkspaceAiChatMessage.answer(85001L, 77L, "만들까요?", "[]"));
    assertThat(answer.getActionStatus()).isEqualTo(WorkspaceAiChatActionStatus.PENDING);

    assertThat(executed(answer.getId(), 85001L)).isEqualTo(1);
    assertThat(executed(answer.getId(), 85001L)).isZero();
    assertThat(messages.findById(answer.getId()).orElseThrow().getActionStatus())
        .isEqualTo(WorkspaceAiChatActionStatus.EXECUTED);
  }

  @Test
  void actionOfAnotherWorkspaceCannotBeExecuted() {
    var answer = messages.saveAndFlush(WorkspaceAiChatMessage.answer(85002L, 77L, "만들까요?", "[]"));

    assertThat(executed(answer.getId(), 85999L)).isZero();
  }

  @Test
  void clearingHidesMessagesOfThatWorkspaceOnlyAndBlocksExecution() {
    messages.saveAndFlush(WorkspaceAiChatMessage.question(85003L, 77L, "질문"));
    var answer = messages.saveAndFlush(WorkspaceAiChatMessage.answer(85003L, 88L, "답변", "[]"));
    messages.saveAndFlush(WorkspaceAiChatMessage.question(85004L, 77L, "다른 워크스페이스"));

    assertThat(messages.softDeleteAllByWorkspaceId(85003L)).isEqualTo(2);

    assertThat(messages.findTop50ByWorkspaceIdAndIsDeletedFalseOrderByIdDesc(85003L)).isEmpty();
    assertThat(messages.findTop50ByWorkspaceIdAndIsDeletedFalseOrderByIdDesc(85004L)).hasSize(1);
    assertThat(executed(answer.getId(), 85003L)).isZero();
  }

  @Test
  void answerWithoutActionsHasNoActionStatus() {
    var answer = messages.saveAndFlush(WorkspaceAiChatMessage.answer(85005L, 77L, "답변", null));

    assertThat(answer.getActionStatus()).isNull();
    assertThat(executed(answer.getId(), 85005L)).isZero();
  }

  private int executed(Long messageId, Long workspaceId) {
    return messages.changeActionStatus(
        messageId,
        workspaceId,
        WorkspaceAiChatActionStatus.PENDING,
        WorkspaceAiChatActionStatus.EXECUTED);
  }
}

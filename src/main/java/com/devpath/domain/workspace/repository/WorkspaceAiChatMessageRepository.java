package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceAiChatActionStatus;
import com.devpath.domain.workspace.entity.WorkspaceAiChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface WorkspaceAiChatMessageRepository
    extends JpaRepository<WorkspaceAiChatMessage, Long> {

  List<WorkspaceAiChatMessage> findTop50ByWorkspaceIdAndIsDeletedFalseOrderByIdDesc(
      Long workspaceId);

  /** 상태가 from일 때만 to로 바꾼다. 동시에 실행해도 한쪽만 1을 돌려받는다. */
  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query(
      "update WorkspaceAiChatMessage m set m.actionStatus = :to"
          + " where m.id = :messageId and m.workspaceId = :workspaceId"
          + " and m.isDeleted = false and m.actionStatus = :from")
  int changeActionStatus(
      Long messageId,
      Long workspaceId,
      WorkspaceAiChatActionStatus from,
      WorkspaceAiChatActionStatus to);

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query(
      "update WorkspaceAiChatMessage m set m.isDeleted = true"
          + " where m.workspaceId = :workspaceId and m.isDeleted = false")
  int softDeleteAllByWorkspaceId(Long workspaceId);
}

package com.devpath.domain.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 워크스페이스 AI 에이전트 대화 한 건. 팀원 모두가 같은 대화를 공유한다. */
@Entity
@Table(
    name = "workspace_ai_chat_message",
    indexes = @Index(name = "idx_workspace_ai_chat_message_workspace", columnList = "workspace_id, id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceAiChatMessage {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "workspace_id", nullable = false)
  private Long workspaceId;

  // 질문했거나 변경을 실행한 팀원
  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "role", nullable = false, length = 20)
  private WorkspaceAiChatRole role;

  @Column(name = "content", nullable = false, columnDefinition = "TEXT")
  private String content;

  // AI 변경 제안 원본(JSON 배열). 제안이 없으면 null
  @Column(name = "actions_json", columnDefinition = "TEXT")
  private String actionsJson;

  @Enumerated(EnumType.STRING)
  @Column(name = "action_status", length = 20)
  private WorkspaceAiChatActionStatus actionStatus;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "is_deleted", nullable = false, columnDefinition = "boolean default false")
  private boolean isDeleted;

  private WorkspaceAiChatMessage(
      Long workspaceId, Long userId, WorkspaceAiChatRole role, String content, String actionsJson) {
    this.workspaceId = workspaceId;
    this.userId = userId;
    this.role = role;
    this.content = content;
    this.actionsJson = actionsJson;
    this.actionStatus = actionsJson == null ? null : WorkspaceAiChatActionStatus.PENDING;
    this.createdAt = Instant.now();
  }

  public static WorkspaceAiChatMessage question(Long workspaceId, Long userId, String content) {
    return new WorkspaceAiChatMessage(workspaceId, userId, WorkspaceAiChatRole.USER, content, null);
  }

  public static WorkspaceAiChatMessage answer(
      Long workspaceId, Long userId, String content, String actionsJson) {
    return new WorkspaceAiChatMessage(
        workspaceId, userId, WorkspaceAiChatRole.ASSISTANT, content, actionsJson);
  }
}

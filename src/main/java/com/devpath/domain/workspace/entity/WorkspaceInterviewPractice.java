package com.devpath.domain.workspace.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "workspace_interview_practice",
    uniqueConstraints = @UniqueConstraint(columnNames = {"workspace_id", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceInterviewPractice {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "workspace_id", nullable = false)
  private Long workspaceId;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  @Column(name = "shared_answers", columnDefinition = "TEXT")
  private String sharedAnswers;

  public void shareAnswers(String sharedAnswers) {
    this.sharedAnswers = sharedAnswers;
  }

  public WorkspaceInterviewPractice(Long workspaceId, Long userId, String content) {
    this.workspaceId = workspaceId;
    this.userId = userId;
    this.content = content;
  }

  public void update(String content) {
    this.content = content;
  }
}

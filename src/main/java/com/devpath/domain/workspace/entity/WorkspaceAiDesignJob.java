package com.devpath.domain.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspace_ai_design_job")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceAiDesignJob {

  @Id private UUID id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "active_user_id", unique = true)
  private Long activeUserId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private WorkspaceAiDesignJobStatus status;

  @Column(name = "request_json", nullable = false, columnDefinition = "TEXT")
  private String requestJson;

  @Column(name = "result_json", columnDefinition = "TEXT")
  private String resultJson;

  @Column(name = "error_message", columnDefinition = "TEXT")
  private String errorMessage;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "completed_at")
  private Instant completedAt;

  @Column(name = "processing_started_at")
  private Instant processingStartedAt;

  public WorkspaceAiDesignJob(Long userId, String requestJson) {
    this.id = UUID.randomUUID();
    this.userId = userId;
    this.activeUserId = userId;
    this.status = WorkspaceAiDesignJobStatus.PENDING;
    this.requestJson = requestJson;
    this.createdAt = Instant.now();
  }

  public static WorkspaceAiDesignJob restore(
      UUID id,
      Long userId,
      WorkspaceAiDesignJobStatus status,
      String requestJson,
      String resultJson,
      String errorMessage,
      Instant createdAt,
      Instant completedAt,
      Instant processingStartedAt) {
    WorkspaceAiDesignJob job = new WorkspaceAiDesignJob();
    job.id = id;
    job.userId = userId;
    job.activeUserId =
        status == WorkspaceAiDesignJobStatus.PENDING
                || status == WorkspaceAiDesignJobStatus.PROCESSING
            ? userId
            : null;
    job.status = status;
    job.requestJson = requestJson;
    job.resultJson = resultJson;
    job.errorMessage = errorMessage;
    job.createdAt = createdAt;
    job.completedAt = completedAt;
    job.processingStartedAt = processingStartedAt;
    return job;
  }

  public void complete(String resultJson) {
    this.status = WorkspaceAiDesignJobStatus.COMPLETED;
    this.resultJson = resultJson;
    this.errorMessage = null;
    this.completedAt = Instant.now();
    this.activeUserId = null;
    this.processingStartedAt = null;
  }

  public void fail(String errorMessage) {
    this.status = WorkspaceAiDesignJobStatus.FAILED;
    this.resultJson = null;
    this.errorMessage = errorMessage;
    this.completedAt = Instant.now();
    this.activeUserId = null;
    this.processingStartedAt = null;
  }
}

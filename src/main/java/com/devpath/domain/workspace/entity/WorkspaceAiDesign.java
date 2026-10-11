package com.devpath.domain.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspace_ai_design")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceAiDesign {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "workspace_id", nullable = false, unique = true)
  private Long workspaceId;

  @Column(name = "job_id", nullable = false, unique = true)
  private UUID jobId;

  @Column(name = "design_json", nullable = false, columnDefinition = "TEXT")
  private String designJson;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "assets_initialized", nullable = false, columnDefinition = "boolean default false")
  private boolean assetsInitialized;

  public void markAssetsInitialized() {
    assetsInitialized = true;
  }

  public void updateDesign(String designJson) {
    this.designJson = designJson;
  }

  public WorkspaceAiDesign(Long workspaceId, UUID jobId, String designJson) {
    this.workspaceId = workspaceId;
    this.jobId = jobId;
    this.designJson = designJson;
    this.createdAt = Instant.now();
  }
}

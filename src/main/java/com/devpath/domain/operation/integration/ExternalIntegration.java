package com.devpath.domain.operation.integration;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(
    name = "external_integration",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"workspace_id", "provider"})})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ExternalIntegration {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "workspace_id", nullable = false)
  private Long workspaceId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 50)
  private IntegrationProvider provider;

  @Column(name = "is_active", nullable = false)
  private boolean isActive;

  @Column(name = "connected_at")
  private LocalDateTime connectedAt;

  @Column(name = "repository_url", length = 1000)
  private String repositoryUrl;

  @Column(name = "repository_owner", length = 120)
  private String repositoryOwner;

  @Column(name = "repository_name", length = 160)
  private String repositoryName;

  @Column(name = "last_synced_at")
  private LocalDateTime lastSyncedAt;

  @Column(name = "last_sync_message", length = 500)
  private String lastSyncMessage;

  @CreatedDate
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public ExternalIntegration(Long workspaceId, IntegrationProvider provider) {
    this.workspaceId = workspaceId;
    this.provider = provider;
    this.isActive = false;
  }

  public void activate() {
    this.isActive = true;
    this.connectedAt = LocalDateTime.now();
  }

  public void deactivate() {
    this.isActive = false;
  }

  public void configureRepository(
      String repositoryUrl, String repositoryOwner, String repositoryName) {
    this.repositoryUrl = repositoryUrl;
    this.repositoryOwner = repositoryOwner;
    this.repositoryName = repositoryName;
  }

  public void markSynced(String message) {
    this.lastSyncedAt = LocalDateTime.now();
    this.lastSyncMessage = message;
  }
}

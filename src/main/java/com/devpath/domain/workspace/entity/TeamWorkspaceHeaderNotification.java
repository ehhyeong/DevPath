package com.devpath.domain.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "team_workspace_header_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class TeamWorkspaceHeaderNotification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "team_workspace_header_notification_id")
  private Long id;

  @Column(name = "workspace_id", nullable = false)
  private Long workspaceId;

  @Column(name = "page_key", nullable = false, length = 40)
  private String pageKey;

  @Column(nullable = false, length = 500)
  private String message;

  @Column(name = "time_label", nullable = false, length = 40)
  private String timeLabel;

  @Column(name = "target_path", length = 120)
  private String targetPath;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  @Column(name = "is_deleted", nullable = false)
  private boolean isDeleted;

  @CreatedDate
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public TeamWorkspaceHeaderNotification(
      Long workspaceId,
      String pageKey,
      String message,
      String timeLabel,
      String targetPath,
      int displayOrder) {
    this.workspaceId = workspaceId;
    this.pageKey = pageKey;
    this.message = message;
    this.timeLabel = timeLabel;
    this.targetPath = targetPath;
    this.displayOrder = displayOrder;
    this.isDeleted = false;
  }

  public void delete() {
    this.isDeleted = true;
  }
}

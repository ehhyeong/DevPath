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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "workspace_member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class WorkspaceMember {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "workspace_id", nullable = false)
  private Long workspaceId;

  @Column(name = "learner_id", nullable = false)
  private Long learnerId;

  @CreatedDate
  @Column(name = "joined_at", updatable = false)
  private LocalDateTime joinedAt;

  @Column(name = "last_active_at")
  private LocalDateTime lastActiveAt;

  @Column(name = "position_label", length = 80)
  private String positionLabel;

  @Builder
  public WorkspaceMember(Long workspaceId, Long learnerId, String positionLabel) {
    this.workspaceId = workspaceId;
    this.learnerId = learnerId;
    this.positionLabel = normalizePositionLabel(positionLabel);
  }

  public void markActive(LocalDateTime activeAt) {
    this.lastActiveAt = activeAt;
  }

  public void assignPositionLabel(String positionLabel) {
    this.positionLabel = normalizePositionLabel(positionLabel);
  }

  private static String normalizePositionLabel(String positionLabel) {
    if (positionLabel == null || positionLabel.isBlank()) {
      return null;
    }
    return positionLabel.trim();
  }
}

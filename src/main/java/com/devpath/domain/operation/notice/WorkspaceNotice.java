package com.devpath.domain.operation.notice;

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
@Table(name = "workspace_notice")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class WorkspaceNotice {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "workspace_id", nullable = false)
  private Long workspaceId;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(columnDefinition = "TEXT", nullable = false)
  private String content;

  @Column(name = "is_deleted", nullable = false)
  private boolean isDeleted;

  @CreatedDate
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public WorkspaceNotice(Long workspaceId, String title, String content) {
    this.workspaceId = workspaceId;
    this.title = title;
    this.content = content;
    this.isDeleted = false;
  }

  public void updateNotice(String title, String content) {
    this.title = title;
    this.content = content;
  }

  public void delete() {
    this.isDeleted = true;
  }
}

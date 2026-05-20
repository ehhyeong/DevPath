package com.devpath.domain.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "workspace_file")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class WorkspaceFile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "workspace_id", nullable = false)
  private Long workspaceId;

  @Column(name = "parent_id")
  private Long parentId;

  @Column(name = "original_file_name", nullable = false)
  private String originalFileName;

  @Column(name = "stored_file_name", nullable = false)
  private String storedFileName;

  @Column(name = "file_path", nullable = false)
  private String filePath;

  @Column(name = "file_size", nullable = false)
  private long fileSize;

  @Column(name = "content_type")
  private String contentType;

  @Builder.Default
  @Enumerated(EnumType.STRING)
  @Column(name = "item_type", nullable = false, length = 20)
  private WorkspaceFileType itemType = WorkspaceFileType.FILE;

  @Builder.Default
  @Column(name = "storage_provider", nullable = false, length = 50)
  private String storageProvider = "LOCAL";

  @Column(name = "object_key", length = 1000)
  private String objectKey;

  @Column(name = "uploaded_by_id", nullable = false)
  private Long uploadedById;

  @Builder.Default
  @Column(name = "is_deleted", nullable = false)
  private boolean isDeleted = false;

  @CreatedDate
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public void delete() {
    this.isDeleted = true;
  }

  public void rename(String name) {
    this.originalFileName = name;
  }

  public boolean isFolder() {
    return this.itemType == WorkspaceFileType.FOLDER;
  }
}

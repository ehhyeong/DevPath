package com.devpath.domain.squad.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "squads")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Squad {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "squad_id")
  private Long id;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "is_archived", nullable = false)
  private Boolean isArchived = false;

  @Column(name = "archived_at")
  private LocalDateTime archivedAt;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted = false;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public Squad(String name, String description) {
    this.name = name;
    this.description = description;
    this.isArchived = false;
    this.isDeleted = false;
  }

  public void updateSettings(String name, String description) {
    if (name != null && !name.isBlank()) {
      this.name = name;
    }
    if (description != null) {
      this.description = description;
    }
  }

  public void archive() {
    this.isArchived = true;
    this.archivedAt = LocalDateTime.now();
  }

  public void restore() {
    this.isArchived = false;
    this.archivedAt = null;
  }

  public void delete() {
    this.isDeleted = true;
    this.deletedAt = LocalDateTime.now();
  }
}

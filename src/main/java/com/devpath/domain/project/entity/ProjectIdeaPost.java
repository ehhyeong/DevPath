package com.devpath.domain.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "project_idea_post")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProjectIdeaPost {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "author_id", nullable = false)
  private Long authorId;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(columnDefinition = "TEXT", nullable = false)
  private String content;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private IdeaPostStatus status = IdeaPostStatus.PUBLISHED;

  @Column(name = "is_deleted", nullable = false)
  @Builder.Default
  private Boolean isDeleted = false;

  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    this.createdAt = LocalDateTime.now();
  }

  public void updateContent(String title, String content) {
    this.title = title;
    this.content = content;
  }

  public void markAsDeleted() {
    this.isDeleted = true;
  }
}

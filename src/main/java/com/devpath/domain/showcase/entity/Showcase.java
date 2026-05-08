package com.devpath.domain.showcase.entity;

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
@Table(name = "showcase")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@EntityListeners(AuditingEntityListener.class)
public class Showcase {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  private String thumbnailUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ShowcaseCategory category;

  @Builder.Default private boolean isPublic = true;

  @Builder.Default private long viewCount = 0;

  @Builder.Default private boolean isDeleted = false;

  @CreatedDate private LocalDateTime createdAt;

  @LastModifiedDate private LocalDateTime updatedAt;

  public void update(
      String title,
      String description,
      String thumbnailUrl,
      ShowcaseCategory category,
      boolean isPublic) {
    this.title = title;
    this.description = description;
    this.thumbnailUrl = thumbnailUrl;
    this.category = category;
    this.isPublic = isPublic;
  }

  public void delete() {
    this.isDeleted = true;
  }

  public void incrementView() {
    this.viewCount++;
  }
}

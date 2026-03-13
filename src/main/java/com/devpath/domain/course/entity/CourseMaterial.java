package com.devpath.domain.course.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "course_materials")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CourseMaterial {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "material_id")
  private Long materialId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "lesson_id", nullable = false)
  private Lesson lesson;

  @Enumerated(EnumType.STRING)
  @Column(name = "material_type", nullable = false, length = 30)
  private MaterialType materialType;

  @Column(nullable = false, length = 150)
  private String title;

  @Column(name = "material_url", nullable = false, length = 500)
  private String materialUrl;

  @Column(name = "original_file_name", length = 255)
  private String originalFileName;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  // 레슨 자료 정보를 수정한다.
  public void updateMetadata(
      MaterialType materialType, String title, String materialUrl, String originalFileName) {
    this.materialType = materialType;
    this.title = title;
    this.materialUrl = materialUrl;
    this.originalFileName = originalFileName;
  }
}

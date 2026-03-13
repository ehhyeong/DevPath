package com.devpath.domain.course.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

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

  @Column(name = "material_type")
  private String materialType;

  @Column(name = "material_url")
  private String materialUrl;

  @Column(name = "asset_key")
  private String assetKey;

  @Column(name = "original_file_name")
  private String originalFileName;

  @Column(name = "sort_order")
  private Integer sortOrder;

  public void updateMetadata(
      String materialType,
      String materialUrl,
      String assetKey,
      String originalFileName,
      Integer sortOrder) {
    this.materialType = materialType;
    this.materialUrl = materialUrl;
    this.assetKey = assetKey;
    this.originalFileName = originalFileName;
    this.sortOrder = sortOrder;
  }

  public void changeSortOrder(Integer sortOrder) {
    this.sortOrder = sortOrder;
  }
}

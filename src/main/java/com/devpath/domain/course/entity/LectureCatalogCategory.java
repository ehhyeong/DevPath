package com.devpath.domain.course.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 강의 목록 상단 카테고리의 기본 정보를 저장한다.
@Entity
@Table(name = "lecture_catalog_categories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class LectureCatalogCategory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "category_key", nullable = false, unique = true, length = 50)
  private String categoryKey;

  @Column(nullable = false, length = 80)
  private String label;

  @Column(nullable = false, length = 120)
  private String title;

  @Column(name = "icon_class", nullable = false, length = 120)
  private String iconClass;

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder;

  @Builder.Default
  @Column(name = "is_active", nullable = false)
  private Boolean active = true;
}

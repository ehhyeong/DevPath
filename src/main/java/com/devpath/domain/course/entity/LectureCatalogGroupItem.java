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

// 그룹 안에서 실제 필터 버튼으로 노출되는 항목을 저장한다.
@Entity
@Table(name = "lecture_catalog_group_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class LectureCatalogGroupItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "group_id", nullable = false)
  private LectureCatalogGroup group;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(name = "linked_category_key", length = 50)
  private String linkedCategoryKey;

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder;
}

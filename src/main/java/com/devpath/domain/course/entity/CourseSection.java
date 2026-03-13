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
@Table(name = "course_sections")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CourseSection {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "section_id")
  private Long sectionId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "sort_order")
  private Integer sortOrder;

  @Column(name = "is_published")
  private Boolean isPublished;

  public void updateInfo(String title, String description) {
    this.title = title;
    this.description = description;
  }

  public void changeSortOrder(Integer sortOrder) {
    this.sortOrder = sortOrder;
  }

  public void changePublished(Boolean isPublished) {
    this.isPublished = isPublished;
  }
  @Column(nullable = false, length = 150)
  private String title;

  @Column(name = "section_order", nullable = false)
  private Integer sortOrder;

  // 섹션의 기본 정보를 수정한다.
  public void updateInfo(String title) {
    this.title = title;
  }

  // 섹션의 정렬 순서를 변경한다.
  public void changeSortOrder(Integer sortOrder) {
    this.sortOrder = sortOrder;
  }
}

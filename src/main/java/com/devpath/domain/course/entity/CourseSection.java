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
  private Integer orderIndex;

  @Column(name = "is_published")
  private Boolean isPublished;

  public void updateInfo(String title, String description) {
    this.title = title;
    this.description = description;
  }

  public void changeOrderIndex(Integer orderIndex) {
    this.orderIndex = orderIndex;
  }

  public void changeSortOrder(Integer sortOrder) {
    this.orderIndex = sortOrder;
  }

  public void changePublished(Boolean isPublished) {
    this.isPublished = isPublished;
  }
}

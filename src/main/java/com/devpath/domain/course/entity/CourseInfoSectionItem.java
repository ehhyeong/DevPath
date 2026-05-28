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
@Table(name = "course_info_section_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CourseInfoSectionItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "info_section_item_id")
  private Long infoSectionItemId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(name = "section_key", nullable = false, length = 50)
  private String sectionKey;

  @Column(name = "section_title", nullable = false)
  private String sectionTitle;

  @Column(name = "section_order", nullable = false)
  private Integer sectionOrder;

  @Column(name = "item_text", nullable = false, length = 1000)
  private String itemText;

  @Column(name = "item_order", nullable = false)
  private Integer itemOrder;
}

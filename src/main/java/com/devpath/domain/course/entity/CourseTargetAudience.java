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
@Table(name = "course_target_audiences")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CourseTargetAudience {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "target_audience_id")
  private Long targetAudienceId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(nullable = false, length = 255)
  private String content;

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder;

  // 강의 수강 대상 설명을 수정한다.
  public void updateAudienceDescription(String audienceDescription) {
    this.content = audienceDescription;
  }

  // 강의 수강 대상 표시 순서를 변경한다.
  public void changeDisplayOrder(Integer displayOrder) {
    this.sortOrder = displayOrder;
  }
}

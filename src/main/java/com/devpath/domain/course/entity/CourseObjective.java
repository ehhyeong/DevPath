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
@Table(name = "course_objectives")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CourseObjective {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "objective_id")
  private Long objectiveId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(name = "objective_text", nullable = false)
  private String objectiveText;

  @Column(name = "display_order")
  private Integer displayOrder;

  public void updateObjectiveText(String objectiveText) {
    this.objectiveText = objectiveText;
  }

  public void changeDisplayOrder(Integer displayOrder) {
    this.displayOrder = displayOrder;
  }
}

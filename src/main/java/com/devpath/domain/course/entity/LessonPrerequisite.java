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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Stores prerequisite links without expanding the core Lesson aggregate itself.
@Entity
@Table(
    name = "lesson_prerequisites",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_lesson_prerequisites_lesson_prerequisite",
          columnNames = {"lesson_id", "prerequisite_lesson_id"})
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LessonPrerequisite {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "lesson_prerequisite_id")
  private Long lessonPrerequisiteId;

  // Target lesson that owns this prerequisite rule.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "lesson_id", nullable = false)
  private Lesson lesson;

  // Lesson that must be completed before the target lesson.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "prerequisite_lesson_id", nullable = false)
  private Lesson prerequisiteLesson;

  @Builder
  private LessonPrerequisite(Lesson lesson, Lesson prerequisiteLesson) {
    this.lesson = lesson;
    this.prerequisiteLesson = prerequisiteLesson;
  }
}

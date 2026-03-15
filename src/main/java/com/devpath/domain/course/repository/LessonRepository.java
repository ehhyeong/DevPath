package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Lesson;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

  List<Lesson> findAllBySectionSectionIdOrderByOrderIndexAsc(Long sectionId);

  // Loads prerequisite candidates while keeping instructor ownership checks in the query.
  List<Lesson> findAllByLessonIdInAndSectionCourseInstructorId(List<Long> lessonIds, Long instructorId);

  // Collects all lessons under a course before child cleanup work begins.
  List<Lesson> findAllBySectionCourseCourseId(Long courseId);

  default List<Lesson> findAllBySectionSectionIdOrderBySortOrderAsc(Long sectionId) {
    return findAllBySectionSectionIdOrderByOrderIndexAsc(sectionId);
  }

  Optional<Lesson> findByLessonIdAndSectionCourseInstructorId(Long lessonId, Long instructorId);

  void deleteAllBySectionCourseCourseId(Long courseId);
}

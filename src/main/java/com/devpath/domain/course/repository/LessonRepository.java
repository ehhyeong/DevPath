package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Lesson;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
  List<Lesson> findAllBySectionSectionIdOrderBySortOrderAsc(Long sectionId);

  Optional<Lesson> findByLessonIdAndSectionCourseInstructorId(Long lessonId, Long instructorId);

  void deleteAllBySectionCourseCourseId(Long courseId);
}

package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseMaterial;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {
  List<CourseMaterial> findAllByLessonLessonIdOrderBySortOrderAsc(Long lessonId);

  Optional<CourseMaterial> findByMaterialIdAndLessonSectionCourseInstructorId(
      Long materialId, Long instructorId);

  void deleteAllByLessonSectionCourseCourseId(Long courseId);
}

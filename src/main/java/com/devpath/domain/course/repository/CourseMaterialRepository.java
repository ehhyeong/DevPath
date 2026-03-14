package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseMaterial;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {
  // 특정 레슨의 자료 목록을 표시 순서대로 조회한다.
  List<CourseMaterial> findAllByLessonLessonIdOrderByDisplayOrderAsc(Long lessonId);

  // 하위 호환을 위해 기존 sortOrder 메서드 이름도 유지한다.
  default List<CourseMaterial> findAllByLessonLessonIdOrderBySortOrderAsc(Long lessonId) {
    return findAllByLessonLessonIdOrderByDisplayOrderAsc(lessonId);
  }

  Optional<CourseMaterial> findByMaterialIdAndLessonSectionCourseInstructorId(
      Long materialId, Long instructorId);

  void deleteAllByLessonSectionCourseCourseId(Long courseId);
}

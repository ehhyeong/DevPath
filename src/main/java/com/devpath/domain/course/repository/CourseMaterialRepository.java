package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseMaterial;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {
  // 특정 레슨의 자료 목록을 표시 순서대로 조회한다.
  List<CourseMaterial> findAllByLessonLessonIdOrderByDisplayOrderAsc(Long lessonId);

  @Query(
      """
      select cm
      from CourseMaterial cm
      where cm.lesson.lessonId in :lessonIds
      order by cm.lesson.lessonId asc, cm.displayOrder asc, cm.materialId asc
      """)
  List<CourseMaterial> findAllByLessonIdsInDisplayOrder(
      @Param("lessonIds") Collection<Long> lessonIds);

  // 하위 호환을 위해 기존 sortOrder 메서드 이름도 유지한다.
  default List<CourseMaterial> findAllByLessonLessonIdOrderBySortOrderAsc(Long lessonId) {
    return findAllByLessonLessonIdOrderByDisplayOrderAsc(lessonId);
  }

  Optional<CourseMaterial> findByMaterialIdAndLessonSectionCourseInstructorId(
      Long materialId, Long instructorId);

  Optional<CourseMaterial> findByMaterialIdAndLessonLessonId(Long materialId, Long lessonId);

  void deleteAllByLessonSectionCourseCourseId(Long courseId);
}

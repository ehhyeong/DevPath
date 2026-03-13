package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseMaterial;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {
  List<CourseMaterial> findAllByLessonLessonIdOrderBySortOrderAsc(Long lessonId);

  Optional<CourseMaterial> findByMaterialIdAndLessonSectionCourseInstructorId(
      Long materialId, Long instructorId);

// 레슨 자료 조회와 삭제를 담당한다.
public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {

  // 특정 레슨의 자료 목록을 생성 순서대로 조회한다.
  List<CourseMaterial> findAllByLessonLessonIdOrderByCreatedAtAsc(Long lessonId);

  // 현재 로그인한 강사가 소유한 강의의 자료인지 검증하며 조회한다.
  Optional<CourseMaterial> findByMaterialIdAndLessonSectionCourseInstructorId(
      Long materialId, Long instructorId);

  // 강의 삭제 전에 해당 강의에 속한 자료를 일괄 삭제한다.
  void deleteAllByLessonSectionCourseCourseId(Long courseId);
}

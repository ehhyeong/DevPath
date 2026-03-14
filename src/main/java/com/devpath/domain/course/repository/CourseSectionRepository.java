package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseSection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseSectionRepository extends JpaRepository<CourseSection, Long> {
  // 특정 강의의 섹션 목록을 순서대로 조회한다.
  List<CourseSection> findAllByCourseCourseIdOrderByOrderIndexAsc(Long courseId);

  // 하위 호환을 위해 기존 sortOrder 메서드 이름도 유지한다.
  default List<CourseSection> findAllByCourseCourseIdOrderBySortOrderAsc(Long courseId) {
    return findAllByCourseCourseIdOrderByOrderIndexAsc(courseId);
  }

  // 현재 로그인한 강사가 소유한 섹션인지 검증하며 조회한다.
  Optional<CourseSection> findBySectionIdAndCourseInstructorId(Long sectionId, Long instructorId);

  void deleteAllByCourseCourseId(Long courseId);
}

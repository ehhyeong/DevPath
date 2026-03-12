package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseSection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// 섹션 조회와 강사 소유권 검증을 담당한다.
public interface CourseSectionRepository extends JpaRepository<CourseSection, Long> {

  // 특정 강의의 섹션 목록을 순서대로 조회한다.
  List<CourseSection> findAllByCourseCourseIdOrderBySortOrderAsc(Long courseId);

  // 현재 로그인한 강사가 소유한 강의의 섹션인지 검증하며 조회한다.
  Optional<CourseSection> findBySectionIdAndCourseInstructorId(Long sectionId, Long instructorId);

  // 강의 삭제 전에 해당 강의의 섹션을 일괄 삭제한다.
  void deleteAllByCourseCourseId(Long courseId);
}

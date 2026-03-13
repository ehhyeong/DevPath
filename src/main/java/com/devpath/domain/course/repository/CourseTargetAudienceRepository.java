package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseTargetAudience;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

// 강의 수강 대상 조회와 삭제를 담당한다.
public interface CourseTargetAudienceRepository
    extends JpaRepository<CourseTargetAudience, Long> {

  // 특정 강의의 수강 대상 목록을 표시 순서대로 조회한다.
  List<CourseTargetAudience> findAllByCourseCourseIdOrderBySortOrderAsc(Long courseId);

  // 강의 삭제 전에 해당 강의의 수강 대상을 일괄 삭제한다.
  void deleteAllByCourseCourseId(Long courseId);
}

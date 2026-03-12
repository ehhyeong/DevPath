package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseObjective;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

// 강의 목표 조회와 삭제를 담당한다.
public interface CourseObjectiveRepository extends JpaRepository<CourseObjective, Long> {

  // 특정 강의의 목표 목록을 표시 순서대로 조회한다.
  List<CourseObjective> findAllByCourseCourseIdOrderBySortOrderAsc(Long courseId);

  // 강의 삭제 전에 해당 강의의 목표를 일괄 삭제한다.
  void deleteAllByCourseCourseId(Long courseId);
}

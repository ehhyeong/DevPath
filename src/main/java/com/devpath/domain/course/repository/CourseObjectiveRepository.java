package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseObjective;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseObjectiveRepository extends JpaRepository<CourseObjective, Long> {
  List<CourseObjective> findAllByCourseCourseIdOrderByDisplayOrderAsc(Long courseId);

  void deleteAllByCourseCourseId(Long courseId);
}

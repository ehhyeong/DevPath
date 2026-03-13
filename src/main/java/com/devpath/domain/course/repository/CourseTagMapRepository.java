package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseTagMap;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseTagMapRepository extends JpaRepository<CourseTagMap, Long> {
  List<CourseTagMap> findAllByCourseCourseId(Long courseId);

  void deleteAllByCourseCourseId(Long courseId);
}

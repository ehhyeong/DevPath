package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseNodeMapping;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseNodeMappingRepository extends JpaRepository<CourseNodeMapping, Long> {
  List<CourseNodeMapping> findAllByCourseCourseId(Long courseId);

  List<CourseNodeMapping> findAllByCourseCourseIdIn(Collection<Long> courseIds);

  void deleteAllByCourseCourseId(Long courseId);
}

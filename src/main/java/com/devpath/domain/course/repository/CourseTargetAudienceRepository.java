package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseTargetAudience;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseTargetAudienceRepository
    extends JpaRepository<CourseTargetAudience, Long> {
  List<CourseTargetAudience> findAllByCourseCourseIdOrderByDisplayOrderAsc(Long courseId);

  void deleteAllByCourseCourseId(Long courseId);
}

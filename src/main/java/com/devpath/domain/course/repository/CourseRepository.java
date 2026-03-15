package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// Repository for course ownership checks and public course lookups.
public interface CourseRepository extends JpaRepository<Course, Long> {

  Optional<Course> findByCourseIdAndInstructorId(Long courseId, Long instructorId);

  boolean existsByCourseIdAndInstructorId(Long courseId, Long instructorId);

  List<Course> findByStatus(CourseStatus status);

  // Loads the most recent published courses for an instructor channel.
  List<Course> findTop4ByInstructorIdAndStatusOrderByPublishedAtDescCourseIdDesc(
      Long instructorId, CourseStatus status);
}

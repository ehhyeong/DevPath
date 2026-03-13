package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Course;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
  Optional<Course> findByCourseIdAndInstructorId(Long courseId, Long instructorId);

  boolean existsByCourseIdAndInstructorId(Long courseId, Long instructorId);
}

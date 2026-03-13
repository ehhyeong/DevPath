package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseSection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseSectionRepository extends JpaRepository<CourseSection, Long> {
  List<CourseSection> findAllByCourseCourseIdOrderBySortOrderAsc(Long courseId);

  Optional<CourseSection> findBySectionIdAndCourseInstructorId(Long sectionId, Long instructorId);

  void deleteAllByCourseCourseId(Long courseId);
}

package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorFeaturedCourse;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorFeaturedCourseRepository
    extends JpaRepository<InstructorFeaturedCourse, Long> {

  List<InstructorFeaturedCourse> findAllByInstructorIdAndIsDeletedFalseOrderBySortOrderAsc(
      Long instructorId);
}

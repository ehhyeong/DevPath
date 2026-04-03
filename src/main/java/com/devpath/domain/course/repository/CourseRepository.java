package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {

    Optional<Course> findByCourseIdAndInstructorId(Long courseId, Long instructorId);

    boolean existsByCourseIdAndInstructorId(Long courseId, Long instructorId);

    List<Course> findByStatus(CourseStatus status);

    long countByStatus(CourseStatus status);

    List<Course> findTop3ByStatusOrderByPublishedAtDescCourseIdDesc(CourseStatus status);

    Optional<Course> findByCourseIdAndStatus(Long courseId, CourseStatus status);

    List<Course> findTop4ByInstructorIdAndStatusOrderByPublishedAtDescCourseIdDesc(
        Long instructorId,
        CourseStatus status
    );

    List<Course> findAllByInstructorIdOrderByCourseIdDesc(Long instructorId);

    List<Course> findAllByInstructorIdAndStatusOrderByCourseIdDesc(Long instructorId, CourseStatus status);

    long countByInstructorId(Long instructorId);

    long countByInstructorIdAndStatus(Long instructorId, CourseStatus status);
}

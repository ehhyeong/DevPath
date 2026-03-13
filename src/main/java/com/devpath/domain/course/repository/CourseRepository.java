package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Course;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
  Optional<Course> findByCourseIdAndInstructorId(Long courseId, Long instructorId);

// 강의 소유권 검증과 강의 조회를 담당한다.
public interface CourseRepository extends JpaRepository<Course, Long> {

  // 현재 로그인한 강사의 강의인지 검증하며 강의를 조회한다.
  Optional<Course> findByCourseIdAndInstructorId(Long courseId, Long instructorId);

  // 현재 로그인한 강사가 소유한 강의인지 존재 여부만 검증한다.
  boolean existsByCourseIdAndInstructorId(Long courseId, Long instructorId);
}

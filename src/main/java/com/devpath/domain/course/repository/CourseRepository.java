package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {

  Optional<Course> findByCourseIdAndInstructorId(Long courseId, Long instructorId);

  boolean existsByCourseIdAndInstructorId(Long courseId, Long instructorId);

  @EntityGraph(attributePaths = "instructor")
  List<Course> findByStatus(CourseStatus status);

  long countByStatus(CourseStatus status);

  List<Course> findTop3ByStatusOrderByPublishedAtDescCourseIdDesc(CourseStatus status);

  @EntityGraph(attributePaths = "instructor")
  Optional<Course> findByCourseIdAndStatus(Long courseId, CourseStatus status);

  List<Course> findTop4ByInstructorIdAndStatusOrderByPublishedAtDescCourseIdDesc(
      Long instructorId, CourseStatus status);

  List<Course> findAllByInstructorIdOrderByCourseIdDesc(Long instructorId);

  List<Course> findAllByInstructorIdAndStatusOrderByCourseIdDesc(
      Long instructorId, CourseStatus status);

  long countByInstructorId(Long instructorId);

  long countByInstructorIdAndStatus(Long instructorId, CourseStatus status);

  // [TEMP] 추천 무료 강좌 조회용 — 임시 하드코딩, 추후 삭제 예정
  Optional<Course> findFirstByTitleAndStatus(String title, CourseStatus status);
  // [/TEMP]
}

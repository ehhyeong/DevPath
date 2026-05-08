package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, Long> {

  boolean existsByUser_IdAndCourse_CourseId(Long userId, Long courseId);

  Optional<CourseEnrollment> findByUser_IdAndCourse_CourseId(Long userId, Long courseId);

  @Query(
      """
        select e
        from CourseEnrollment e
        join fetch e.course c
        join fetch e.user u
        where e.user.id = :userId
        order by e.enrolledAt desc
        """)
  List<CourseEnrollment> findAllByUserIdWithCourse(@Param("userId") Long userId);

  @Query(
      """
        select e
        from CourseEnrollment e
        join fetch e.course c
        join fetch e.user u
        where e.user.id = :userId
          and e.status = :status
        order by e.enrolledAt desc
        """)
  List<CourseEnrollment> findAllByUserIdAndStatusWithCourse(
      @Param("userId") Long userId, @Param("status") EnrollmentStatus status);

  @Query(
      """
        select e
        from CourseEnrollment e
        join fetch e.course c
        join fetch e.user u
        where c.instructorId = :instructorId
        order by e.enrolledAt desc
        """)
  List<CourseEnrollment> findAllByCourseInstructorIdOrderByEnrolledAtDesc(
      @Param("instructorId") Long instructorId);

  @Query(
      """
        select e.course.courseId
        from CourseEnrollment e
        where e.user.id = :userId
          and e.course.courseId in :courseIds
        """)
  List<Long> findCourseIdsByUserIdAndCourseIds(
      @Param("userId") Long userId, @Param("courseIds") Collection<Long> courseIds);

  long countByUser_IdAndStatus(Long userId, EnrollmentStatus status);

  long countByCourseInstructorId(Long instructorId);

  long countByCourseInstructorIdAndStatus(Long instructorId, EnrollmentStatus status);
}

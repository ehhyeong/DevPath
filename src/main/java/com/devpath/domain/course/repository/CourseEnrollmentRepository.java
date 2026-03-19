package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, Long> {

    /**
     * 특정 사용자의 특정 강의 수강 여부 확인
     */
    boolean existsByUser_IdAndCourse_CourseId(Long userId, Long courseId);

    /**
     * 특정 사용자의 특정 강의 수강 내역 조회
     */
    Optional<CourseEnrollment> findByUser_IdAndCourse_CourseId(Long userId, Long courseId);

    /**
     * 특정 사용자의 모든 수강 내역 조회 (최신순)
     */
    @Query("SELECT e FROM CourseEnrollment e " +
           "JOIN FETCH e.course c " +
           "WHERE e.user.id = :userId " +
           "ORDER BY e.enrolledAt DESC")
    List<CourseEnrollment> findAllByUserIdWithCourse(@Param("userId") Long userId);

    /**
     * 특정 사용자의 상태별 수강 내역 조회
     */
    @Query("SELECT e FROM CourseEnrollment e " +
           "JOIN FETCH e.course c " +
           "WHERE e.user.id = :userId " +
           "AND e.status = :status " +
           "ORDER BY e.enrolledAt DESC")
    List<CourseEnrollment> findAllByUserIdAndStatusWithCourse(
        @Param("userId") Long userId,
        @Param("status") EnrollmentStatus status
    );

    /**
     * 특정 사용자의 수강 중인 강의 개수
     */
    long countByUser_IdAndStatus(Long userId, EnrollmentStatus status);
}

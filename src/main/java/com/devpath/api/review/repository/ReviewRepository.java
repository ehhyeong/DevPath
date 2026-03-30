package com.devpath.api.review.repository;

import com.devpath.api.review.entity.Review;
import com.devpath.api.review.entity.ReviewStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByCourseIdAndIsDeletedFalseAndIsHiddenFalseOrderByCreatedAtDesc(Long courseId);

    Optional<Review> findByIdAndIsDeletedFalse(Long id);

    Optional<Review> findByIdAndIsDeletedFalseAndIsHiddenFalse(Long id);

    boolean existsByCourseIdAndLearnerIdAndIsDeletedFalse(Long courseId, Long learnerId);

    @Query("""
            SELECT COUNT(r)
            FROM Review r
            WHERE r.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND r.isDeleted = false
            """)
    long countByInstructorId(@Param("instructorId") Long instructorId);

    @Query("""
            SELECT COUNT(r)
            FROM Review r
            WHERE r.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND r.isDeleted = false
            AND r.status = :status
            """)
    long countByInstructorIdAndStatus(
            @Param("instructorId") Long instructorId,
            @Param("status") ReviewStatus status
    );

    @Query("""
            SELECT AVG(r.rating)
            FROM Review r
            WHERE r.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND r.isDeleted = false
            """)
    Double findAverageRatingByInstructorId(@Param("instructorId") Long instructorId);

    @Query("""
            SELECT r.rating, COUNT(r)
            FROM Review r
            WHERE r.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND r.isDeleted = false
            GROUP BY r.rating
            """)
    List<Object[]> findRatingDistributionByInstructorId(@Param("instructorId") Long instructorId);
}

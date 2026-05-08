package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseWishlist;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseWishlistRepository extends JpaRepository<CourseWishlist, Long> {

  /** 특정 사용자의 특정 강의 찜 여부 확인 */
  boolean existsByUser_IdAndCourse_CourseId(Long userId, Long courseId);

  /** 특정 사용자의 특정 강의 찜 조회 */
  Optional<CourseWishlist> findByUser_IdAndCourse_CourseId(Long userId, Long courseId);

  /** 특정 사용자의 모든 찜 목록 조회 (최신순) */
  @Query(
      "SELECT w FROM CourseWishlist w "
          + "JOIN FETCH w.course c "
          + "WHERE w.user.id = :userId "
          + "ORDER BY w.createdAt DESC")
  List<CourseWishlist> findAllByUserIdWithCourse(@Param("userId") Long userId);

  @Query(
      """
        select w.course.courseId
        from CourseWishlist w
        where w.user.id = :userId
          and w.course.courseId in :courseIds
        """)
  List<Long> findCourseIdsByUserIdAndCourseIds(
      @Param("userId") Long userId, @Param("courseIds") Collection<Long> courseIds);

  /** 특정 사용자의 찜 개수 */
  long countByUser_Id(Long userId);
}

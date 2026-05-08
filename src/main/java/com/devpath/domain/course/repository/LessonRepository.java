package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.entity.LessonType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

  List<Lesson> findAllBySectionSectionIdOrderByOrderIndexAsc(Long sectionId);

  List<Lesson> findAllByLessonIdInAndSectionCourseInstructorId(
      List<Long> lessonIds, Long instructorId);

  List<Lesson> findAllBySectionCourseCourseId(Long courseId);

  @Query(
      """
        select l
        from Lesson l
        join fetch l.section s
        join fetch s.course c
        where c.courseId in :courseIds
          and coalesce(s.isPublished, true) = true
          and coalesce(l.isPublished, true) = true
          and l.lessonType = :lessonType
        order by c.courseId asc, s.orderIndex asc, l.orderIndex asc, l.lessonId asc
        """)
  List<Lesson> findPublishedLessonsByCourseIdsAndTypeInDisplayOrder(
      @Param("courseIds") Collection<Long> courseIds, @Param("lessonType") LessonType lessonType);

  @Query(
      """
        select l
        from Lesson l
        where l.section.sectionId in :sectionIds
        order by l.section.sectionId asc, l.orderIndex asc, l.lessonId asc
        """)
  List<Lesson> findAllBySectionIdsInDisplayOrder(@Param("sectionIds") Collection<Long> sectionIds);

  @Query(
      """
        select count(l)
        from Lesson l
        where l.section.course.instructorId = :instructorId
          and coalesce(l.isPublished, false) = true
        """)
  long countBySectionCourseInstructorIdAndIsPublishedTrue(@Param("instructorId") Long instructorId);

  @Query(
      """
        select l
        from Lesson l
        join fetch l.section s
        join fetch s.course c
        where c.instructorId = :instructorId
          and coalesce(l.isPublished, false) = true
        order by c.courseId asc, l.orderIndex asc, l.lessonId asc
        """)
  List<Lesson> findAllBySectionCourseInstructorIdAndIsPublishedTrue(
      @Param("instructorId") Long instructorId);

  @Query(
      """
        select count(l)
        from Lesson l
        where l.section.course.courseId in :courseIds
          and coalesce(l.isPublished, false) = true
        """)
  long countPublishedLessonsByCourseIds(@Param("courseIds") Collection<Long> courseIds);

  default List<Lesson> findAllBySectionSectionIdOrderBySortOrderAsc(Long sectionId) {
    return findAllBySectionSectionIdOrderByOrderIndexAsc(sectionId);
  }

  Optional<Lesson> findByLessonIdAndSectionCourseInstructorId(Long lessonId, Long instructorId);

  void deleteAllBySectionCourseCourseId(Long courseId);
}

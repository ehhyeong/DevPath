package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseTagMapRepository extends JpaRepository<CourseTagMap, Long> {
  @EntityGraph(attributePaths = "tag")
  List<CourseTagMap> findAllByCourseCourseId(Long courseId);

  @EntityGraph(attributePaths = {"course", "tag"})
  @Query(
      """
            select ctm
            from CourseTagMap ctm
            order by ctm.course.courseId asc, ctm.tag.name asc
            """)
  // 관리자 대시보드 카테고리 집계를 위해 강의와 태그를 함께 읽는다.
  List<CourseTagMap> findAllWithCourseAndTag();

  @Query(
      """
            select t.name
            from CourseTagMap ctm
            join ctm.tag t
            where ctm.course.courseId = :courseId
            order by t.name asc
            """)
  List<String> findTagNamesByCourseId(@Param("courseId") Long courseId);

  @EntityGraph(attributePaths = "tag")
  @Query(
      """
            select ctm
            from CourseTagMap ctm
            where ctm.course.courseId in :courseIds
            order by ctm.course.courseId asc, ctm.tag.name asc
            """)
  // 여러 강의의 태그를 한 번에 읽어 병합 로직과 표 구성을 단순화한다.
  List<CourseTagMap> findAllByCourseCourseIdInOrderByCourseAndTagName(
      @Param("courseIds") Collection<Long> courseIds);

  List<CourseTagMap> findAllByTagTagId(Long tagId);

  boolean existsByCourseCourseIdAndTagTagId(Long courseId, Long tagId);

  void deleteAllByCourseCourseId(Long courseId);

  // [TEMP] 추천 무료 강좌 조회용 — 임시 하드코딩, 추후 삭제 예정
  @Query(
      """
      SELECT ctm.course.courseId FROM CourseTagMap ctm
      WHERE ctm.tag.name IN :tagNames
      AND ctm.course.status = :status
      AND (ctm.course.price IS NULL OR ctm.course.price = 0)
      ORDER BY ctm.course.courseId ASC
      """)
  List<Long> findFreePublishedCourseIdsByTagNames(
      @Param("tagNames") Collection<String> tagNames, @Param("status") CourseStatus status);
  // [/TEMP]
}

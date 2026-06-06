package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.LessonProgress;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

  Optional<LessonProgress> findByUserIdAndLessonLessonId(Long userId, Long lessonId);

  List<LessonProgress> findAllByUserId(Long userId);

  boolean existsByUserIdAndLessonLessonIdAndIsCompletedTrue(Long userId, Long lessonId);

  long countByUserIdAndLastWatchedAtAfter(Long userId, LocalDateTime lastWatchedAt);

  @Query(
      """
            select lp
            from LessonProgress lp
            join fetch lp.user u
            join fetch lp.lesson l
            join fetch l.section s
            join fetch s.course c
            where c.instructorId = :instructorId
            """)
  List<LessonProgress> findAllByInstructorId(@Param("instructorId") Long instructorId);

  @Query(
      """
            select count(lp)
            from LessonProgress lp
            where lp.lesson.section.course.instructorId = :instructorId
              and lp.isCompleted = true
            """)
  long countByInstructorIdAndIsCompletedTrue(@Param("instructorId") Long instructorId);

  @Query(
      """
            select count(lp)
            from LessonProgress lp
            where lp.user.id = :userId
              and lp.lesson.section.course.courseId in :courseIds
              and lp.isCompleted = true
            """)
  long countCompletedLessonsByUserIdAndCourseIds(
      @Param("userId") Long userId, @Param("courseIds") Collection<Long> courseIds);

  @Query(
      """
            select coalesce(sum(lp.progressSeconds), 0)
            from LessonProgress lp
            where lp.user.id = :learnerId
            """)
  Long sumProgressSecondsByLearnerId(@Param("learnerId") Long learnerId);

  @Query(
      """
            select lp
            from LessonProgress lp
            join fetch lp.lesson l
            join fetch l.section s
            where lp.user.id = :userId
            and lp.lastWatchedAt is not null
            order by lp.lastWatchedAt desc
            """)
  List<LessonProgress> findRecentByUserIdWithLessonAndSection(
      @Param("userId") Long userId, Pageable pageable);

  // branch 노드 재학습 진행: 노드의 필수태그 중, 기준 시각(노드 추가 시점) 이후 매칭 강의를 완료한 distinct 태그 수.
  @Query(
      """
      select count(distinct nrt.tag.tagId)
      from LessonProgress lp, CourseTagMap ctm, NodeRequiredTag nrt
      where lp.user.id = :userId
        and lp.isCompleted = true
        and lp.lastWatchedAt > :since
        and ctm.course.courseId = lp.lesson.section.course.courseId
        and nrt.tag.tagId = ctm.tag.tagId
        and nrt.node.nodeId = :nodeId
      """)
  long countRelearnedTagsForNode(
      @Param("userId") Long userId,
      @Param("nodeId") Long nodeId,
      @Param("since") LocalDateTime since);
}

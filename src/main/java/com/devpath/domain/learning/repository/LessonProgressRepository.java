package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.LessonProgress;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

    Optional<LessonProgress> findByUserIdAndLessonLessonId(Long userId, Long lessonId);

    List<LessonProgress> findAllByUserId(Long userId);

    boolean existsByUserIdAndLessonLessonIdAndIsCompletedTrue(Long userId, Long lessonId);

    @Query("""
        select lp
        from LessonProgress lp
        join fetch lp.user u
        join fetch lp.lesson l
        join fetch l.section s
        join fetch s.course c
        where c.instructorId = :instructorId
        """)
    List<LessonProgress> findAllByInstructorId(@Param("instructorId") Long instructorId);

    @Query("""
        select count(lp)
        from LessonProgress lp
        where lp.lesson.section.course.instructorId = :instructorId
          and lp.isCompleted = true
        """)
    long countByInstructorIdAndIsCompletedTrue(@Param("instructorId") Long instructorId);

    @Query("""
        select count(lp)
        from LessonProgress lp
        where lp.user.id = :userId
          and lp.lesson.section.course.courseId in :courseIds
          and lp.isCompleted = true
        """)
    long countCompletedLessonsByUserIdAndCourseIds(
            @Param("userId") Long userId,
            @Param("courseIds") Collection<Long> courseIds
    );

    @Query("""
            select coalesce(sum(lp.progressSeconds), 0)
            from LessonProgress lp
            where lp.user.id = :learnerId
            """)
    Long sumProgressSecondsByLearnerId(@Param("learnerId") Long learnerId);
}

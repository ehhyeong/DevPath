package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.LessonProgress;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 레슨 진도 저장소다.
public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

    // 특정 유저의 특정 레슨 진도를 조회한다.
    Optional<LessonProgress> findByUserIdAndLessonLessonId(Long userId, Long lessonId);

    // 특정 유저의 전체 레슨 진도를 조회한다.
    List<LessonProgress> findAllByUserId(Long userId);

    // 특정 레슨 완료 여부를 확인한다.
    boolean existsByUserIdAndLessonLessonIdAndIsCompletedTrue(Long userId, Long lessonId);

    // 특정 유저가 여러 강의에서 완료한 레슨 개수를 조회한다.
    @Query(
        """
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
}

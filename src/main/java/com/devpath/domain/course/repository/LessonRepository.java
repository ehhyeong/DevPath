package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Lesson;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 레슨 저장소다.
public interface LessonRepository extends JpaRepository<Lesson, Long> {

  // 섹션별 레슨 목록을 순서대로 조회한다.
  List<Lesson> findAllBySectionSectionIdOrderByOrderIndexAsc(Long sectionId);

  // 선수 레슨 후보를 강사 소유권과 함께 조회한다.
  List<Lesson> findAllByLessonIdInAndSectionCourseInstructorId(List<Long> lessonIds, Long instructorId);

  // 강의 하위의 모든 레슨을 조회한다.
  List<Lesson> findAllBySectionCourseCourseId(Long courseId);

  // 여러 강의에 포함된 공개 레슨 수를 조회한다.
  @Query(
      """
      select count(l)
      from Lesson l
      where l.section.course.courseId in :courseIds
        and coalesce(l.isPublished, false) = true
      """)
  long countPublishedLessonsByCourseIds(@Param("courseIds") Collection<Long> courseIds);

  // 기존 정렬 메서드 호환용이다.
  default List<Lesson> findAllBySectionSectionIdOrderBySortOrderAsc(Long sectionId) {
    return findAllBySectionSectionIdOrderByOrderIndexAsc(sectionId);
  }

  // 특정 강사 소유 강의의 레슨을 조회한다.
  Optional<Lesson> findByLessonIdAndSectionCourseInstructorId(Long lessonId, Long instructorId);

  // 특정 강의 하위 레슨을 일괄 삭제한다.
  void deleteAllBySectionCourseCourseId(Long courseId);
}

package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Lesson;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
  // 특정 섹션의 레슨 목록을 순서대로 조회한다.
  List<Lesson> findAllBySectionSectionIdOrderByOrderIndexAsc(Long sectionId);

  // 하위 호환을 위해 기존 sortOrder 메서드 이름도 유지한다.
  default List<Lesson> findAllBySectionSectionIdOrderBySortOrderAsc(Long sectionId) {
    return findAllBySectionSectionIdOrderByOrderIndexAsc(sectionId);
  }

  // 현재 로그인한 강사가 소유한 레슨인지 검증하며 조회한다.
  Optional<Lesson> findByLessonIdAndSectionCourseInstructorId(Long lessonId, Long instructorId);

  void deleteAllBySectionCourseCourseId(Long courseId);
}

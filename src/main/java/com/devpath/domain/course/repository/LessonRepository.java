package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.Lesson;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// 레슨 조회와 강사 소유권 검증을 담당한다.
public interface LessonRepository extends JpaRepository<Lesson, Long> {

  // 특정 섹션의 레슨 목록을 순서대로 조회한다.
  List<Lesson> findAllBySectionSectionIdOrderBySortOrderAsc(Long sectionId);

  // 현재 로그인한 강사가 소유한 강의의 레슨인지 검증하며 조회한다.
  Optional<Lesson> findByLessonIdAndSectionCourseInstructorId(Long lessonId, Long instructorId);

  // 강의 삭제 전에 해당 강의에 속한 레슨을 일괄 삭제한다.
  void deleteAllBySectionCourseCourseId(Long courseId);
}

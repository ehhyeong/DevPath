package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseTagMap;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseTagMapRepository extends JpaRepository<CourseTagMap, Long> {
  List<CourseTagMap> findAllByCourseCourseId(Long courseId);

// 강의-태그 매핑 조회와 삭제를 담당한다.
public interface CourseTagMapRepository extends JpaRepository<CourseTagMap, Long> {

  // 특정 강의에 연결된 태그 매핑 목록을 조회한다.
  List<CourseTagMap> findAllByCourseCourseId(Long courseId);

  // 강의 삭제 전에 해당 강의의 태그 매핑을 일괄 삭제한다.
  void deleteAllByCourseCourseId(Long courseId);
}

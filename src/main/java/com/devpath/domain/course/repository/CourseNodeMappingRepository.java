package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseNodeMapping;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 강의-노드 매핑 저장소다.
public interface CourseNodeMappingRepository extends JpaRepository<CourseNodeMapping, Long> {

  // 특정 강의의 노드 매핑 목록을 조회한다.
  List<CourseNodeMapping> findAllByCourseCourseId(Long courseId);

  // 여러 강의의 노드 매핑 목록을 조회한다.
  List<CourseNodeMapping> findAllByCourseCourseIdIn(Collection<Long> courseIds);

  // 특정 노드에 연결된 강의 ID 목록을 조회한다.
  @Query(
      """
      select cnm.course.courseId
      from CourseNodeMapping cnm
      where cnm.node.nodeId = :nodeId
      order by cnm.course.courseId asc
      """)
  List<Long> findCourseIdsByNodeId(@Param("nodeId") Long nodeId);

  // 특정 강의의 노드 매핑을 삭제한다.
  void deleteAllByCourseCourseId(Long courseId);
}

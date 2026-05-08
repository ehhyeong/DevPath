package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.Assignment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

  Optional<Assignment> findByIdAndIsDeletedFalse(Long id);

  Optional<Assignment> findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long nodeId);

  @Query(
      """
        select a
        from Assignment a
        where a.roadmapNode.nodeId = :nodeId
          and a.isDeleted = false
        order by a.createdAt desc
        """)
  List<Assignment> findAllByRoadmapNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(
      @Param("nodeId") Long nodeId);

  @Query(
      """
        select a
        from Assignment a
        join fetch a.roadmapNode rn
        where rn.nodeId in :nodeIds
          and a.isDeleted = false
        order by a.createdAt desc
        """)
  List<Assignment> findAllByRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(
      @Param("nodeIds") Collection<Long> nodeIds);
}

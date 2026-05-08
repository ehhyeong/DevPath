package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.Quiz;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

  Optional<Quiz> findByIdAndIsDeletedFalse(Long id);

  Optional<Quiz> findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(Long nodeId);

  @Query(
      """
        select q
        from Quiz q
        where q.roadmapNode.nodeId = :nodeId
          and q.isDeleted = false
        order by q.createdAt desc
        """)
  List<Quiz> findAllByRoadmapNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(
      @Param("nodeId") Long nodeId);

  @Query(
      """
        select q
        from Quiz q
        join fetch q.roadmapNode rn
        where rn.nodeId in :nodeIds
          and q.isDeleted = false
        order by q.createdAt desc
        """)
  List<Quiz> findAllByRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(
      @Param("nodeIds") Collection<Long> nodeIds);
}

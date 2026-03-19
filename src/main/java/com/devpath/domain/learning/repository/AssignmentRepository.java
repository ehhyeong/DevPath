package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.Assignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    // soft delete 되지 않은 과제를 id 기준으로 단건 조회한다.
    Optional<Assignment> findByIdAndIsDeletedFalse(Long id);

    // 특정 로드맵 노드에 연결된 과제를 최신 생성순으로 조회한다.
    @Query(
            """
            select a
            from Assignment a
            where a.roadmapNode.nodeId = :nodeId
              and a.isDeleted = false
            order by a.createdAt desc
            """
    )
    List<Assignment> findAllByRoadmapNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(@Param("nodeId") Long nodeId);
}

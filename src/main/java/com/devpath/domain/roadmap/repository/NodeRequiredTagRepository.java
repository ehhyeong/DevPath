package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NodeRequiredTagRepository extends JpaRepository<NodeRequiredTag, Long> {

    /**
     * 특정 노드의 모든 필수 태그 조회
     * @param nodeId 노드 ID
     * @return 해당 노드의 필수 태그 리스트
     */
    @Query("SELECT nrt FROM NodeRequiredTag nrt " +
            "JOIN FETCH nrt.tag " +
            "WHERE nrt.node.id = :nodeId")
    List<NodeRequiredTag> findAllByNodeId(@Param("nodeId") Long nodeId);

    /**
     * 특정 노드의 필수 태그 이름 리스트 조회 (검증용)
     * @param nodeId 노드 ID
     * @return 태그 이름 리스트
     */
    @Query("SELECT t.name FROM NodeRequiredTag nrt " +
            "JOIN nrt.tag t " +
            "WHERE nrt.node.id = :nodeId")
    List<String> findTagNamesByNodeId(@Param("nodeId") Long nodeId);
}

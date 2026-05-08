package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NodeRequiredTagRepository extends JpaRepository<NodeRequiredTag, Long> {

  @Query(
      """
      select nrt
      from NodeRequiredTag nrt
      join fetch nrt.tag
      where nrt.node.nodeId = :nodeId
      order by nrt.id asc
      """)
  List<NodeRequiredTag> findAllByNodeId(@Param("nodeId") Long nodeId);

  @Query(
      """
      select t.name
      from NodeRequiredTag nrt
      join nrt.tag t
      where nrt.node.nodeId = :nodeId
      order by t.name asc
      """)
  List<String> findTagNamesByNodeId(@Param("nodeId") Long nodeId);

  @Query(
      """
      select nrt.node.nodeId as nodeId, t.name as tagName
      from NodeRequiredTag nrt
      join nrt.tag t
      where nrt.node.nodeId in :nodeIds
      order by nrt.node.nodeId asc, nrt.id asc
      """)
  List<NodeRequiredTagNameProjection> findTagNamesByNodeIds(
      @Param("nodeIds") Collection<Long> nodeIds);

  List<NodeRequiredTag> findAllByTagTagId(Long tagId);

  interface NodeRequiredTagNameProjection {
    Long getNodeId();

    String getTagName();
  }

  boolean existsByNodeNodeIdAndTagTagId(Long nodeId, Long tagId);

  // 사용자 커스텀 로드맵에서 클리어 노드 이후(sort_order > minSortOrder) 노드들이 보유한 태그명 목록
  // 심화 추천 시 이후에 배울 내용을 중복 추천하지 않기 위한 필터 용도
  @Query(
      """
      select distinct t.name
      from NodeRequiredTag nrt
      join nrt.tag t
      where nrt.node.nodeId in (
          select c.originalNode.nodeId
          from CustomRoadmapNode c
          where c.customRoadmap.user.id = :userId
            and c.customRoadmap.originalRoadmap.roadmapId = :roadmapId
            and c.originalNode.sortOrder > :minSortOrder
      )
      """)
  List<String> findFutureTagNamesByUserAndRoadmap(
      @Param("userId") Long userId,
      @Param("roadmapId") Long roadmapId,
      @Param("minSortOrder") int minSortOrder);

  @Modifying
  @Query("delete from NodeRequiredTag nrt where nrt.node.nodeId = :nodeId")
  void deleteAllByNodeId(@Param("nodeId") Long nodeId);

  @Modifying
  @Query("delete from NodeRequiredTag nrt where nrt.tag.tagId = :tagId")
  void deleteAllByTagId(@Param("tagId") Long tagId);
}

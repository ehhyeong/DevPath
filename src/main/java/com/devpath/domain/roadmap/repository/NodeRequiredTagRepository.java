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

  boolean existsByNodeNodeIdAndTagTagId(Long nodeId, Long tagId);

  @Modifying
  @Query("delete from NodeRequiredTag nrt where nrt.node.nodeId = :nodeId")
  void deleteAllByNodeId(@Param("nodeId") Long nodeId);

  @Modifying
  @Query("delete from NodeRequiredTag nrt where nrt.tag.tagId = :tagId")
  void deleteAllByTagId(@Param("tagId") Long tagId);

  interface NodeRequiredTagNameProjection {
    Long getNodeId();

    String getTagName();
  }
}

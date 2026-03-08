package com.devpath.domain.roadmap.port;

import java.util.List;

public record OfficialRoadmapSnapshot(
    Long roadmapId,
    String roadmapTitle,
    List<NodeItem> nodes,
    List<PrerequisiteEdge> prerequisiteEdges) {
  public record NodeItem(
      Long nodeId, Long parentNodeId, String title, String description, Integer orderIndex) {}

  // prerequisiteNodeId -> targetNodeId 형태로 저장 (선행조건 그래프)
  public record PrerequisiteEdge(Long prerequisiteNodeId, Long nodeId) {}
}

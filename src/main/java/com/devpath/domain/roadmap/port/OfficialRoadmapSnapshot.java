package com.devpath.domain.roadmap.port;

import java.util.List;

public record OfficialRoadmapSnapshot(Long roadmapId, String roadmapTitle, List<NodeItem> nodes) {
  public record NodeItem(
      Long nodeId, Long parentNodeId, String title, String description, Integer orderIndex) {}
}

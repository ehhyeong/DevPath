package com.devpath.api.roadmap.service;

import java.util.List;
import java.util.Map;

public record CustomRoadmapCopyPlan(
    Long originalRoadmapId,
    String title,
    List<CustomNodePlan> nodes,
    List<PrerequisitePlan> prerequisites,
    Map<Long, Integer> orderIndexByOriginalNodeId) {
  public record CustomNodePlan(
      Long originalNodeId,
      Long parentOriginalNodeId,
      String title,
      String description,
      Integer orderIndex) {}

  public record PrerequisitePlan(Long prerequisiteOriginalNodeId, Long nodeOriginalId) {}
}

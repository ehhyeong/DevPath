package com.devpath.domain.roadmap.port;

import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaOfficialRoadmapReader implements OfficialRoadmapReader {

  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final PrerequisiteRepository prerequisiteRepository;

  @Override
  public OfficialRoadmapSnapshot loadSnapshot(Long roadmapId) {
    return roadmapRepository
        .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
        .map(this::toSnapshot)
        .orElse(null);
  }

  private OfficialRoadmapSnapshot toSnapshot(Roadmap roadmap) {
    List<OfficialRoadmapSnapshot.NodeItem> nodes =
        roadmapNodeRepository.findByRoadmapOrderBySortOrderAsc(roadmap).stream()
            .map(this::toNodeItem)
            .toList();

    Set<Long> nodeIdSet = nodes.stream()
        .map(OfficialRoadmapSnapshot.NodeItem::nodeId)
        .collect(Collectors.toSet());

    // preNode가 현재 로드맵 소속이 아닌 edge는 제외 (데이터 불일치 방어)
    List<OfficialRoadmapSnapshot.PrerequisiteEdge> edges =
        prerequisiteRepository.findAllByNodeRoadmapRoadmapId(roadmap.getRoadmapId()).stream()
            .filter(p -> nodeIdSet.contains(p.getPreNode().getNodeId()))
            .map(this::toPrerequisiteEdge)
            .toList();

    return new OfficialRoadmapSnapshot(roadmap.getRoadmapId(), roadmap.getTitle(), nodes, edges);
  }

  private OfficialRoadmapSnapshot.NodeItem toNodeItem(RoadmapNode node) {
    return new OfficialRoadmapSnapshot.NodeItem(
        node.getNodeId(), null, node.getTitle(), node.getContent(), node.getSortOrder());
  }

  private OfficialRoadmapSnapshot.PrerequisiteEdge toPrerequisiteEdge(Prerequisite prerequisite) {
    return new OfficialRoadmapSnapshot.PrerequisiteEdge(
        prerequisite.getPreNode().getNodeId(), prerequisite.getNode().getNodeId());
  }
}

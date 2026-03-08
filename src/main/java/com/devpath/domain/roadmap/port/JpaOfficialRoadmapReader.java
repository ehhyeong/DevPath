package com.devpath.domain.roadmap.port;

import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Profile("!local")
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

    List<OfficialRoadmapSnapshot.PrerequisiteEdge> edges =
        prerequisiteRepository.findAllByNodeRoadmapRoadmapId(roadmap.getRoadmapId()).stream()
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

package com.devpath.domain.roadmap.port;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Profile("local")
@Component
public class InMemoryOfficialRoadmapReader implements OfficialRoadmapReader {

  @Override
  public OfficialRoadmapSnapshot loadSnapshot(Long roadmapId) {
    if (roadmapId == null) return null;

    List<OfficialRoadmapSnapshot.NodeItem> nodes =
        List.of(
            new OfficialRoadmapSnapshot.NodeItem(1L, null, "Spring Basics", "intro", 1),
            new OfficialRoadmapSnapshot.NodeItem(2L, 1L, "DI", "dependency injection", 2),
            new OfficialRoadmapSnapshot.NodeItem(3L, 1L, "JPA", "jpa basics", 3));

    List<OfficialRoadmapSnapshot.PrerequisiteEdge> edges =
        List.of(new OfficialRoadmapSnapshot.PrerequisiteEdge(2L, 3L));

    return new OfficialRoadmapSnapshot(roadmapId, "Backend Roadmap (Dummy)", nodes, edges);
  }
}

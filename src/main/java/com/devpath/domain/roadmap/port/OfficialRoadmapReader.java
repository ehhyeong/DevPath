package com.devpath.domain.roadmap.port;

public interface OfficialRoadmapReader {
  OfficialRoadmapSnapshot loadSnapshot(Long roadmapId);
}

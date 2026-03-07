package com.devpath.domain.roadmap.port;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InMemoryOfficialRoadmapReader implements OfficialRoadmapReader {

    @Override
    public OfficialRoadmapSnapshot loadSnapshot(Long roadmapId) {
        // ✅ 임시 더미: 로드맵 1개 + 노드 3개 (부모-자식 트리) + 선행조건 1개
        // 나중에 A가 오면 이 구현체는 삭제하고 JPA Reader로 교체하면 됨.

        if (roadmapId == null || roadmapId <= 0) {
            return null;
        }

        List<OfficialRoadmapSnapshot.NodeItem> nodes = List.of(
                new OfficialRoadmapSnapshot.NodeItem(1L, null, "Spring Basics", "intro", 1),
                new OfficialRoadmapSnapshot.NodeItem(2L, 1L, "DI", "dependency injection", 2),
                new OfficialRoadmapSnapshot.NodeItem(3L, 1L, "JPA", "jpa basics", 3)
        );

        List<OfficialRoadmapSnapshot.PrerequisiteEdge> edges = List.of(
                new OfficialRoadmapSnapshot.PrerequisiteEdge(2L, 3L) // DI -> JPA (예시)
        );

        return new OfficialRoadmapSnapshot(
                roadmapId,
                "Backend Roadmap (Dummy)",
                nodes,
                edges
        );
    }
}
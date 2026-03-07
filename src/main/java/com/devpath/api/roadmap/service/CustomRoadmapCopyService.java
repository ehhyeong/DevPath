package com.devpath.api.roadmap.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.port.OfficialRoadmapReader;
import com.devpath.domain.roadmap.port.OfficialRoadmapSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomRoadmapCopyService {

    private final OfficialRoadmapReader officialRoadmapReader;

    /**
     * ✅ B-2 단계 목표:
     * - A 없이도 개발 가능하도록 "딥카피 저장"이 아니라
     *   "복사 플랜 생성"까지만 완성한다.
     * - A가 data.sql + RoadmapNode/Prerequisite 엔티티를 올리면
     *   B-3에서 실제 DB Insert(saveAll)로 이어간다.
     */
    public CustomRoadmapCopyPlan buildCopyPlan(Long roadmapId) {
        OfficialRoadmapSnapshot snapshot = officialRoadmapReader.loadSnapshot(roadmapId);
        if (snapshot == null) {
            throw new CustomException(ErrorCode.ROADMAP_NOT_FOUND);
        }

        List<CustomRoadmapCopyPlan.CustomNodePlan> nodePlans = snapshot.nodes().stream()
                .sorted(Comparator.comparing(OfficialRoadmapSnapshot.NodeItem::orderIndex))
                .map(n -> new CustomRoadmapCopyPlan.CustomNodePlan(
                        n.nodeId(),
                        n.parentNodeId(),
                        n.title(),
                        n.description(),
                        n.orderIndex()
                ))
                .toList();

        List<CustomRoadmapCopyPlan.PrerequisitePlan> prereqPlans = snapshot.prerequisiteEdges().stream()
                .map(e -> new CustomRoadmapCopyPlan.PrerequisitePlan(
                        e.prerequisiteNodeId(),
                        e.nodeId()
                ))
                .toList();

        Map<Long, Integer> orderIndexByOriginalNodeId = snapshot.nodes().stream()
                .collect(Collectors.toMap(
                        OfficialRoadmapSnapshot.NodeItem::nodeId,
                        OfficialRoadmapSnapshot.NodeItem::orderIndex
                ));

        return new CustomRoadmapCopyPlan(
                snapshot.roadmapId(),
                snapshot.roadmapTitle(),
                nodePlans,
                prereqPlans,
                orderIndexByOriginalNodeId
        );
    }
}
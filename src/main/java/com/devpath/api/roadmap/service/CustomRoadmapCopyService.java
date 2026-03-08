package com.devpath.api.roadmap.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.port.OfficialRoadmapReader;
import com.devpath.domain.roadmap.port.OfficialRoadmapSnapshot;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomRoadmapCopyService {

    private final UserRepository userRepository;

    private final RoadmapRepository roadmapRepository;
    private final RoadmapNodeRepository roadmapNodeRepository;

    private final CustomRoadmapRepository customRoadmapRepository;
    private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
    private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;

    private final OfficialRoadmapReader officialRoadmapReader;

    /**
     * B-3: 공식 로드맵을 유저 전용 커스텀 로드맵으로 딥카피(노드 + 선행조건)하여 DB에 저장한다.
     * - A가 오피셜 데이터(data.sql)를 올린 뒤에야 end-to-end로 성공한다.
     */
    @Transactional
    public Long copyToCustomRoadmap(Long userId, Long roadmapId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        OfficialRoadmapSnapshot snapshot = officialRoadmapReader.loadSnapshot(roadmapId);
        if (snapshot == null) {
            throw new CustomException(ErrorCode.ROADMAP_NOT_FOUND);
        }

        // 1) CustomRoadmap 생성/저장
        CustomRoadmap customRoadmap = CustomRoadmap.builder()
                .user(user)
                .originalRoadmap(roadmap)
                .title(roadmap.getTitle())
                .build();
        customRoadmapRepository.save(customRoadmap);

        // 2) 원본 RoadmapNode를 DB에서 실제 로딩 (FK 필요)
        List<Long> originalNodeIds = snapshot.nodes().stream()
                .map(OfficialRoadmapSnapshot.NodeItem::nodeId)
                .distinct()
                .toList();

        List<RoadmapNode> originalNodes = roadmapNodeRepository.findAllById(originalNodeIds);
        if (originalNodes.size() != originalNodeIds.size()) {
            throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
        }

        Map<Long, RoadmapNode> originalNodeMap = originalNodes.stream()
                .collect(Collectors.toMap(RoadmapNode::getNodeId, Function.identity()));

        // 3) CustomRoadmapNode bulk insert
        List<CustomRoadmapNode> customNodesToSave = snapshot.nodes().stream()
                .sorted(Comparator.comparing(OfficialRoadmapSnapshot.NodeItem::orderIndex,
                        Comparator.nullsLast(Integer::compareTo)))
                .map(n -> CustomRoadmapNode.builder()
                        .customRoadmap(customRoadmap)
                        .originalNode(originalNodeMap.get(n.nodeId()))
                        .build())
                .toList();

        List<CustomRoadmapNode> savedCustomNodes = customRoadmapNodeRepository.saveAll(customNodesToSave);

        // 4) Map<originalNodeId, savedCustomNode> 만들기
        Map<Long, CustomRoadmapNode> customNodeByOriginalId = new HashMap<>();
        for (CustomRoadmapNode cn : savedCustomNodes) {
            customNodeByOriginalId.put(cn.getOriginalNode().getNodeId(), cn);
        }

        // 5) 선행조건(edge)을 커스텀으로 변환하여 저장
        List<CustomNodePrerequisite> prereqsToSave = snapshot.prerequisiteEdges().stream()
                .map(e -> {
                    CustomRoadmapNode node = customNodeByOriginalId.get(e.nodeId());
                    CustomRoadmapNode prerequisite = customNodeByOriginalId.get(e.prerequisiteNodeId());

                    if (node == null || prerequisite == null) {
                        throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
                    }

                    return CustomNodePrerequisite.builder()
                            .customRoadmap(customRoadmap)
                            .customNode(node)
                            .prerequisiteCustomNode(prerequisite)
                            .build();
                })
                .toList();

        customNodePrerequisiteRepository.saveAll(prereqsToSave);

        return customRoadmap.getId();
    }
}

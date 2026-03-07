package com.devpath.api.user.service;

import com.devpath.api.user.dto.RoadmapDto;
import com.devpath.api.user.dto.RoadmapNodeDto;
import com.devpath.api.user.repository.RoadmapNodeRepository;
import com.devpath.api.user.repository.RoadmapRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.Roadmap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoadmapService {

    private final RoadmapRepository roadmapRepository;
    private final RoadmapNodeRepository roadmapNodeRepository;

    @Transactional(readOnly = true)
    public List<RoadmapDto.Response> getOfficialRoadmapList() {
        return roadmapRepository.findAllByIsOfficialTrueAndIsDeletedFalse().stream()
                .map(roadmap -> RoadmapDto.Response.builder()
                        .roadmapId(roadmap.getRoadmapId())
                        .title(roadmap.getTitle())
                        .description(roadmap.getDescription())
                        .isOfficial(roadmap.getIsOfficial())
                        .createdAt(roadmap.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoadmapDto.DetailResponse getOfficialRoadmapDetail(Long roadmapId) {
        // 1. 로드맵 기본 정보 조회
        Roadmap roadmap = roadmapRepository.findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        // 2. 해당 로드맵에 속한 노드들을 순서대로 조회
        List<RoadmapNodeDto.Response> nodeDtos = roadmapNodeRepository.findByRoadmapOrderBySortOrderAsc(roadmap).stream()
                .map(node -> RoadmapNodeDto.Response.builder()
                        .nodeId(node.getNodeId())
                        .roadmapId(roadmap.getRoadmapId())
                        .title(node.getTitle())
                        .content(node.getContent())
                        .nodeType(node.getNodeType())
                        .sortOrder(node.getSortOrder())
                        .build())
                .collect(Collectors.toList());

        // 3. 로드맵 정보와 노드 리스트를 결합하여 반환
        return RoadmapDto.DetailResponse.builder()
                .roadmapId(roadmap.getRoadmapId())
                .title(roadmap.getTitle())
                .description(roadmap.getDescription())
                .isOfficial(roadmap.getIsOfficial())
                .createdAt(roadmap.getCreatedAt())
                .nodes(nodeDtos)
                .build();
    }
}
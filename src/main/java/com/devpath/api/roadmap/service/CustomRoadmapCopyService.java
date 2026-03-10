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
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.roadmap.service.TagValidationService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
// 공식 로드맵을 사용자 전용 커스텀 로드맵으로 복사하는 서비스
public class CustomRoadmapCopyService {

  private final UserRepository userRepository;
  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  private final OfficialRoadmapReader officialRoadmapReader;
  private final TagValidationService tagValidationService;
  private final UserTechStackRepository userTechStackRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;

  @Transactional
  // 공식 로드맵의 구조를 복사해 사용자 전용 로드맵과 노드, 선수 관계를 생성한다.
  public Long copyToCustomRoadmap(Long userId, Long roadmapId) {
    // 복사를 요청한 사용자가 실제로 존재하는지 먼저 확인한다.
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    // 복사 대상은 삭제되지 않은 공식 로드맵만 허용한다.
    Roadmap roadmap =
        roadmapRepository
            .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

    // 같은 공식 로드맵을 이미 복사했다면 중복 생성을 막는다.
    if (customRoadmapRepository.existsByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId)) {
      throw new CustomException(ErrorCode.CUSTOM_ROADMAP_ALREADY_EXISTS);
    }

    // 공식 로드맵의 노드 목록과 선수 관계를 한 번에 읽어온다.
    OfficialRoadmapSnapshot snapshot = officialRoadmapReader.loadSnapshot(roadmapId);
    if (snapshot == null) {
      throw new CustomException(ErrorCode.ROADMAP_NOT_FOUND);
    }

    // 사용자의 커스텀 로드맵 껍데기를 먼저 만든 뒤, 세부 노드를 이어서 저장한다.
    CustomRoadmap customRoadmap =
        customRoadmapRepository.save(
            CustomRoadmap.builder()
                .user(user)
                .originalRoadmap(roadmap)
                .title(roadmap.getTitle())
                .build());

    // 스냅샷에 포함된 원본 노드 ID만 추려서 실제 엔티티를 다시 조회한다.
    List<Long> originalNodeIds =
        snapshot.nodes().stream().map(OfficialRoadmapSnapshot.NodeItem::nodeId).distinct().toList();

    // 스냅샷 정보와 DB 정보가 어긋난 경우를 방지하기 위해 개수를 한 번 더 검증한다.
    List<RoadmapNode> originalNodes = roadmapNodeRepository.findAllById(originalNodeIds);
    if (originalNodes.size() != originalNodeIds.size()) {
      throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
    }

    // 이후 변환 과정에서 빠르게 찾을 수 있도록 원본 노드를 Map 형태로 만든다.
    Map<Long, RoadmapNode> originalNodeMap =
        originalNodes.stream()
            .collect(Collectors.toMap(RoadmapNode::getNodeId, Function.identity()));

    // 사용자가 이미 보유한 기술 태그와 노드별 필수 태그를 미리 준비한다.
    List<String> userTags = userTechStackRepository.findTagNamesByUserId(userId);
    Map<Long, List<String>> requiredTagsByNodeId = groupRequiredTagsByNodeId(originalNodeIds);

    // 노드 순서를 유지한 채 커스텀 노드 목록으로 변환한다.
    List<CustomRoadmapNode> customNodesToSave =
        snapshot.nodes().stream()
            .sorted(
                Comparator.comparing(
                    OfficialRoadmapSnapshot.NodeItem::orderIndex,
                    Comparator.nullsLast(Integer::compareTo)))
            .map(
                nodeItem ->
                    buildCustomNode(
                        customRoadmap, originalNodeMap, requiredTagsByNodeId, userTags, nodeItem))
            .toList();

    // 저장 후에는 "원본 노드 ID -> 커스텀 노드" 연결 정보가 필요하다.
    List<CustomRoadmapNode> savedCustomNodes =
        customRoadmapNodeRepository.saveAll(customNodesToSave);
    Map<Long, CustomRoadmapNode> customNodeByOriginalId =
        savedCustomNodes.stream()
            .collect(
                Collectors.toMap(node -> node.getOriginalNode().getNodeId(), Function.identity()));

    // 원본 로드맵의 선수 관계를 커스텀 노드 기준 관계로 다시 생성한다.
    List<CustomNodePrerequisite> prerequisitesToSave =
        snapshot.prerequisiteEdges().stream()
            .map(edge -> buildPrerequisite(customRoadmap, customNodeByOriginalId, edge))
            .toList();

    // 마지막으로 선수 관계까지 저장되면 커스텀 로드맵 복사가 완료된다.
    customNodePrerequisiteRepository.saveAll(prerequisitesToSave);
    return customRoadmap.getId();
  }

  // 각 노드가 요구하는 기술 태그를 노드 ID 기준으로 묶어 둔다.
  private Map<Long, List<String>> groupRequiredTagsByNodeId(List<Long> nodeIds) {
    Map<Long, List<String>> requiredTagsByNodeId = new HashMap<>();

    // 태그가 하나도 없는 노드도 빈 목록으로 조회되도록 기본값을 넣어 둔다.
    for (Long nodeId : nodeIds) {
      requiredTagsByNodeId.put(nodeId, new ArrayList<>());
    }

    // 조회 결과를 노드 ID 기준으로 모아 이후 완료 여부 계산에 사용한다.
    for (NodeRequiredTagRepository.NodeRequiredTagNameProjection projection :
        nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds)) {
      requiredTagsByNodeId
          .computeIfAbsent(projection.getNodeId(), ignored -> new ArrayList<>())
          .add(projection.getTagName());
    }

    return requiredTagsByNodeId;
  }

  // 원본 노드를 커스텀 노드로 변환하고, 조건을 만족하면 완료 상태로 표시한다.
  private CustomRoadmapNode buildCustomNode(
      CustomRoadmap customRoadmap,
      Map<Long, RoadmapNode> originalNodeMap,
      Map<Long, List<String>> requiredTagsByNodeId,
      List<String> userTags,
      OfficialRoadmapSnapshot.NodeItem nodeItem) {
    // 스냅샷의 노드 ID를 기준으로 실제 원본 노드를 찾는다.
    RoadmapNode originalNode = originalNodeMap.get(nodeItem.nodeId());
    CustomRoadmapNode customNode =
        CustomRoadmapNode.builder().customRoadmap(customRoadmap).originalNode(originalNode).build();

    // 사용자가 이미 필요한 기술 태그를 모두 갖고 있으면 자동으로 완료 처리한다.
    List<String> requiredTags =
        requiredTagsByNodeId.getOrDefault(originalNode.getNodeId(), List.of());
    if (!requiredTags.isEmpty() && tagValidationService.validateTags(requiredTags, userTags)) {
      customNode.complete();
    }

    return customNode;
  }

  // 원본 로드맵의 선수 관계를 커스텀 로드맵의 선수 관계로 다시 연결한다.
  private CustomNodePrerequisite buildPrerequisite(
      CustomRoadmap customRoadmap,
      Map<Long, CustomRoadmapNode> customNodeByOriginalId,
      OfficialRoadmapSnapshot.PrerequisiteEdge edge) {
    // 원본 선수 관계의 각 노드를 커스텀 노드로 치환한다.
    CustomRoadmapNode node = customNodeByOriginalId.get(edge.nodeId());
    CustomRoadmapNode prerequisite = customNodeByOriginalId.get(edge.prerequisiteNodeId());

    // 복사 과정 중 누락된 노드가 있으면 잘못된 관계가 생기므로 즉시 예외 처리한다.
    if (node == null || prerequisite == null) {
      throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
    }

    return CustomNodePrerequisite.builder()
        .customRoadmap(customRoadmap)
        .customNode(node)
        .prerequisiteCustomNode(prerequisite)
        .build();
  }
}

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
  public Long copyToCustomRoadmap(Long userId, Long roadmapId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    Roadmap roadmap =
        roadmapRepository
            .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

    if (customRoadmapRepository.existsByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId)) {
      throw new CustomException(ErrorCode.CUSTOM_ROADMAP_ALREADY_EXISTS);
    }

    OfficialRoadmapSnapshot snapshot = officialRoadmapReader.loadSnapshot(roadmapId);
    if (snapshot == null) {
      throw new CustomException(ErrorCode.ROADMAP_NOT_FOUND);
    }

    CustomRoadmap customRoadmap =
        customRoadmapRepository.save(
            CustomRoadmap.builder()
                .user(user)
                .originalRoadmap(roadmap)
                .title(roadmap.getTitle())
                .build());

    List<Long> originalNodeIds =
        snapshot.nodes().stream().map(OfficialRoadmapSnapshot.NodeItem::nodeId).distinct().toList();

    List<RoadmapNode> originalNodes = roadmapNodeRepository.findAllById(originalNodeIds);
    if (originalNodes.size() != originalNodeIds.size()) {
      throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
    }

    Map<Long, RoadmapNode> originalNodeMap =
        originalNodes.stream()
            .collect(Collectors.toMap(RoadmapNode::getNodeId, Function.identity()));

    List<String> userTags = userTechStackRepository.findTagNamesByUserId(userId);
    Map<Long, List<String>> requiredTagsByNodeId = groupRequiredTagsByNodeId(originalNodeIds);

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

    List<CustomRoadmapNode> savedCustomNodes =
        customRoadmapNodeRepository.saveAll(customNodesToSave);
    Map<Long, CustomRoadmapNode> customNodeByOriginalId =
        savedCustomNodes.stream()
            .collect(
                Collectors.toMap(node -> node.getOriginalNode().getNodeId(), Function.identity()));

    List<CustomNodePrerequisite> prerequisitesToSave =
        snapshot.prerequisiteEdges().stream()
            .map(edge -> buildPrerequisite(customRoadmap, customNodeByOriginalId, edge))
            .toList();

    customNodePrerequisiteRepository.saveAll(prerequisitesToSave);
    return customRoadmap.getId();
  }

  private Map<Long, List<String>> groupRequiredTagsByNodeId(List<Long> nodeIds) {
    Map<Long, List<String>> requiredTagsByNodeId = new HashMap<>();
    for (Long nodeId : nodeIds) {
      requiredTagsByNodeId.put(nodeId, new ArrayList<>());
    }

    for (NodeRequiredTagRepository.NodeRequiredTagNameProjection projection :
        nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds)) {
      requiredTagsByNodeId
          .computeIfAbsent(projection.getNodeId(), ignored -> new ArrayList<>())
          .add(projection.getTagName());
    }

    return requiredTagsByNodeId;
  }

  private CustomRoadmapNode buildCustomNode(
      CustomRoadmap customRoadmap,
      Map<Long, RoadmapNode> originalNodeMap,
      Map<Long, List<String>> requiredTagsByNodeId,
      List<String> userTags,
      OfficialRoadmapSnapshot.NodeItem nodeItem) {
    RoadmapNode originalNode = originalNodeMap.get(nodeItem.nodeId());
    CustomRoadmapNode customNode =
        CustomRoadmapNode.builder().customRoadmap(customRoadmap).originalNode(originalNode).build();

    List<String> requiredTags =
        requiredTagsByNodeId.getOrDefault(originalNode.getNodeId(), List.of());
    if (!requiredTags.isEmpty() && tagValidationService.validateTags(requiredTags, userTags)) {
      customNode.complete();
    }

    return customNode;
  }

  private CustomNodePrerequisite buildPrerequisite(
      CustomRoadmap customRoadmap,
      Map<Long, CustomRoadmapNode> customNodeByOriginalId,
      OfficialRoadmapSnapshot.PrerequisiteEdge edge) {
    CustomRoadmapNode node = customNodeByOriginalId.get(edge.nodeId());
    CustomRoadmapNode prerequisite = customNodeByOriginalId.get(edge.prerequisiteNodeId());

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

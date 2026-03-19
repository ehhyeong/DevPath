package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.NodeGovernanceRequests.UpdateCompletionRule;
import com.devpath.api.admin.dto.NodeGovernanceRequests.UpdateNodeType;
import com.devpath.api.admin.dto.NodeGovernanceRequests.UpdatePrerequisites;
import com.devpath.api.admin.dto.NodeGovernanceRequests.UpdateRequiredTags;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.NodeCompletionRule;
import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeCompletionRuleRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminNodeGovernanceService {

  private static final Set<String> ALLOWED_NODE_TYPES =
      Set.of("CONCEPT", "PRACTICE", "PROJECT", "REVIEW", "EXAM");
  private static final Set<String> ALLOWED_COMPLETION_TYPES =
      Set.of("TAG_COVERAGE", "COURSE_COMPLETION", "QUIZ_PASS", "ASSIGNMENT_SUBMISSION");

  private final RoadmapNodeRepository roadmapNodeRepository;
  private final TagRepository tagRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final PrerequisiteRepository prerequisiteRepository;
  private final NodeCompletionRuleRepository nodeCompletionRuleRepository;

  public void updateRequiredTags(Long nodeId, UpdateRequiredTags request) {
    RoadmapNode node = getNode(nodeId);
    List<Long> tagIds = normalizeUniqueIds(request == null ? null : request.getTagIds());
    List<Tag> tags = loadTags(tagIds);

    nodeRequiredTagRepository.deleteAllByNodeId(nodeId);

    if (tags.isEmpty()) {
      return;
    }

    List<NodeRequiredTag> mappings =
        tags.stream().map(tag -> NodeRequiredTag.builder().node(node).tag(tag).build()).toList();

    nodeRequiredTagRepository.saveAll(mappings);
  }

  public void updateNodeType(Long nodeId, UpdateNodeType request) {
    RoadmapNode node = getNode(nodeId);
    String nodeType = normalizeRequiredValue(request == null ? null : request.getNodeType());

    if (!ALLOWED_NODE_TYPES.contains(nodeType)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    node.changeNodeType(nodeType);
  }

  public void updatePrerequisites(Long nodeId, UpdatePrerequisites request) {
    RoadmapNode node = getNode(nodeId);
    List<Long> prerequisiteNodeIds =
        normalizeUniqueIds(request == null ? null : request.getPrerequisiteNodeIds());

    if (prerequisiteNodeIds.contains(nodeId)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    List<RoadmapNode> prerequisiteNodes = loadNodes(prerequisiteNodeIds);
    validateSameRoadmap(node, prerequisiteNodes);

    prerequisiteRepository.deleteAllByNode(node);

    if (prerequisiteNodes.isEmpty()) {
      return;
    }

    List<Prerequisite> prerequisites =
        prerequisiteNodes.stream()
            .map(prerequisiteNode -> Prerequisite.builder().node(node).preNode(prerequisiteNode).build())
            .toList();

    prerequisiteRepository.saveAll(prerequisites);
  }

  public void updateCompletionRule(Long nodeId, UpdateCompletionRule request) {
    RoadmapNode node = getNode(nodeId);
    String criteriaType = normalizeRequiredValue(request == null ? null : request.getCriteriaType());
    String criteriaValue = normalizeRequiredText(request == null ? null : request.getCriteriaValue());

    if (!ALLOWED_COMPLETION_TYPES.contains(criteriaType)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    NodeCompletionRule rule =
        nodeCompletionRuleRepository
            .findByNodeNodeId(nodeId)
            .orElseGet(
                () ->
                    nodeCompletionRuleRepository.save(
                        NodeCompletionRule.builder()
                            .node(node)
                            .criteriaType(criteriaType)
                            .criteriaValue(criteriaValue)
                            .build()));

    rule.updateRule(criteriaType, criteriaValue);
  }

  private RoadmapNode getNode(Long nodeId) {
    return roadmapNodeRepository
        .findById(nodeId)
        .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));
  }

  private List<Tag> loadTags(List<Long> tagIds) {
    if (tagIds.isEmpty()) {
      return List.of();
    }

    List<Tag> loadedTags = tagRepository.findAllById(tagIds);

    if (loadedTags.size() != tagIds.size()) {
      throw new CustomException(ErrorCode.TAG_NOT_FOUND);
    }

    Map<Long, Tag> tagsById = new LinkedHashMap<>();
    for (Tag tag : loadedTags) {
      tagsById.put(tag.getTagId(), tag);
    }

    return tagIds.stream().map(tagsById::get).toList();
  }

  private List<RoadmapNode> loadNodes(List<Long> nodeIds) {
    if (nodeIds.isEmpty()) {
      return List.of();
    }

    List<RoadmapNode> nodes = roadmapNodeRepository.findAllById(nodeIds);

    if (nodes.size() != nodeIds.size()) {
      throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
    }

    Map<Long, RoadmapNode> nodesById = new LinkedHashMap<>();
    for (RoadmapNode node : nodes) {
      nodesById.put(node.getNodeId(), node);
    }

    return nodeIds.stream().map(nodesById::get).toList();
  }

  private void validateSameRoadmap(RoadmapNode node, List<RoadmapNode> prerequisiteNodes) {
    Long roadmapId = node.getRoadmap().getRoadmapId();

    for (RoadmapNode prerequisiteNode : prerequisiteNodes) {
      if (!roadmapId.equals(prerequisiteNode.getRoadmap().getRoadmapId())) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    }
  }

  private List<Long> normalizeUniqueIds(List<Long> values) {
    if (values == null || values.isEmpty()) {
      return List.of();
    }

    LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>();

    for (Long value : values) {
      if (value == null || !uniqueIds.add(value)) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    }

    return uniqueIds.stream().toList();
  }

  private String normalizeRequiredValue(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value.trim().toUpperCase();
  }

  private String normalizeRequiredText(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value.trim();
  }
}

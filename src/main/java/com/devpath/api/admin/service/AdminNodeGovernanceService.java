package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.governance.AdminOfficialRoadmapOptionResponse;
import com.devpath.api.admin.dto.governance.AdminRoadmapNodeSummaryResponse;
import com.devpath.api.admin.dto.governance.NodeCompletionRuleRequest;
import com.devpath.api.admin.dto.governance.NodePrerequisitesRequest;
import com.devpath.api.admin.dto.governance.NodeRequiredTagsRequest;
import com.devpath.api.admin.dto.governance.NodeTypeRequest;
import com.devpath.api.admin.dto.governance.RoadmapNodeUpsertRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.NodeCompletionRule;
import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeCompletionRuleRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
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
// 공식 로드맵 노드의 태그, 유형, 완료 조건을 관리한다.
public class AdminNodeGovernanceService {

  private static final Set<String> ALLOWED_NODE_TYPES =
      Set.of("CONCEPT", "PRACTICE", "PROJECT", "REVIEW", "EXAM", "QUIZ", "ASSIGNMENT");

  private final RoadmapNodeRepository roadmapNodeRepository;
  private final RoadmapRepository roadmapRepository;
  private final TagRepository tagRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final PrerequisiteRepository prerequisiteRepository;
  private final NodeCompletionRuleRepository nodeCompletionRuleRepository;

  @Transactional(readOnly = true)
  // 관리자 표에 필요한 노드와 필수 조건 정보를 한 번에 조합한다.
  public List<AdminRoadmapNodeSummaryResponse> getNodes() {
    List<RoadmapNode> nodes = roadmapNodeRepository.findAllOfficialPublicNodes();

    if (nodes.isEmpty()) {
      return List.of();
    }

    List<Long> nodeIds = nodes.stream().map(RoadmapNode::getNodeId).toList();
    Map<Long, List<String>> requiredTagsByNodeId = buildRequiredTagsMap(nodeIds);
    Map<Long, List<Long>> prerequisiteNodeIdsByNodeId = buildPrerequisiteNodeIdsMap(nodeIds);
    Map<Long, NodeCompletionRule> completionRulesByNodeId =
        nodeCompletionRuleRepository.findAllByNodeNodeIdIn(nodeIds).stream()
            .collect(
                java.util.stream.Collectors.toMap(
                    rule -> rule.getNode().getNodeId(),
                    rule -> rule,
                    (left, right) -> left,
                    LinkedHashMap::new));

    return nodes.stream()
        .map(
            node ->
                toAdminRoadmapNodeSummary(
                    node,
                    requiredTagsByNodeId.getOrDefault(node.getNodeId(), List.of()),
                    prerequisiteNodeIdsByNodeId.getOrDefault(node.getNodeId(), List.of()),
                    completionRulesByNodeId.get(node.getNodeId())))
        .toList();
  }

  @Transactional(readOnly = true)
  // 노드 생성 폼에서 선택 가능한 공식 로드맵 목록을 내려준다.
  public List<AdminOfficialRoadmapOptionResponse> getOfficialRoadmaps() {
    return roadmapRepository.findAllByIsOfficialTrueAndIsDeletedFalseOrderByTitleAsc().stream()
        .map(AdminOfficialRoadmapOptionResponse::from)
        .toList();
  }

  public AdminRoadmapNodeSummaryResponse createNode(RoadmapNodeUpsertRequest request) {
    RoadmapNodeUpsertRequest validRequest = requireNodeRequest(request);
    Roadmap roadmap = getOfficialRoadmap(validRequest.getRoadmapId());
    String nodeType = normalizeNodeType(validRequest.getNodeType());
    String title = normalizeRequiredText(validRequest.getTitle());
    Integer sortOrder = normalizeSortOrder(validRequest.getSortOrder());

    RoadmapNode node =
        roadmapNodeRepository.save(
            RoadmapNode.builder()
                .roadmap(roadmap)
                .title(title)
                .content(normalizeNullableText(validRequest.getContent()))
                .nodeType(nodeType)
                .sortOrder(sortOrder)
                .subTopics(normalizeNullableText(validRequest.getSubTopics()))
                .branchGroup(normalizeOptionalNumber(validRequest.getBranchGroup()))
                .build());

    return toAdminRoadmapNodeSummary(node, List.of(), List.of(), null);
  }

  public AdminRoadmapNodeSummaryResponse updateNode(Long nodeId, RoadmapNodeUpsertRequest request) {
    RoadmapNodeUpsertRequest validRequest = requireNodeRequest(request);
    RoadmapNode node = getNode(nodeId);
    Roadmap roadmap = getOfficialRoadmap(validRequest.getRoadmapId());

    if (!node.getRoadmap().getRoadmapId().equals(roadmap.getRoadmapId())) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    node.updateAdminInfo(
        normalizeRequiredText(validRequest.getTitle()),
        normalizeNullableText(validRequest.getContent()),
        normalizeNodeType(validRequest.getNodeType()),
        normalizeSortOrder(validRequest.getSortOrder()),
        normalizeNullableText(validRequest.getSubTopics()),
        normalizeOptionalNumber(validRequest.getBranchGroup()));

    List<String> requiredTags =
        buildRequiredTagsMap(List.of(node.getNodeId())).getOrDefault(node.getNodeId(), List.of());
    List<Long> prerequisiteNodeIds =
        buildPrerequisiteNodeIdsMap(List.of(node.getNodeId()))
            .getOrDefault(node.getNodeId(), List.of());
    NodeCompletionRule completionRule =
        nodeCompletionRuleRepository.findByNodeNodeId(node.getNodeId()).orElse(null);

    return toAdminRoadmapNodeSummary(node, requiredTags, prerequisiteNodeIds, completionRule);
  }

  // 노드 필수 태그를 전체 교체 방식으로 갱신한다.
  public void updateRequiredTags(Long nodeId, NodeRequiredTagsRequest request) {
    RoadmapNode node = getNode(nodeId);
    List<String> tagNames =
        request != null && request.getRequiredTags() != null
            ? request.getRequiredTags()
            : List.of();

    List<Tag> tags =
        tagNames.stream()
            .map(
                name ->
                    tagRepository
                        .findByName(name)
                        .orElseThrow(() -> new CustomException(ErrorCode.TAG_NOT_FOUND)))
            .collect(java.util.stream.Collectors.toList());

    nodeRequiredTagRepository.deleteAllByNodeId(nodeId);

    if (tags.isEmpty()) {
      return;
    }

    List<NodeRequiredTag> mappings =
        tags.stream().map(tag -> NodeRequiredTag.builder().node(node).tag(tag).build()).toList();
    nodeRequiredTagRepository.saveAll(mappings);
  }

  public void updateNodeType(Long nodeId, NodeTypeRequest request) {
    RoadmapNode node = getNode(nodeId);
    String nodeType = normalizeNodeType(request == null ? null : request.getNodeType());

    node.changeNodeType(nodeType);
  }

  public void updatePrerequisites(Long nodeId, NodePrerequisitesRequest request) {
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
            .map(
                prerequisiteNode ->
                    Prerequisite.builder().node(node).preNode(prerequisiteNode).build())
            .toList();
    prerequisiteRepository.saveAll(prerequisites);
  }

  // 노드 완료 규칙은 없으면 생성하고 있으면 같은 레코드를 갱신한다.
  public void updateCompletionRule(Long nodeId, NodeCompletionRuleRequest request) {
    RoadmapNode node = getNode(nodeId);
    String criteriaType =
        normalizeRequiredText(request == null ? null : request.getCompletionRuleDescription())
            .toUpperCase();
    String criteriaValue =
        request != null && request.getRequiredProgressRate() != null
            ? request.getRequiredProgressRate().toString()
            : "0";

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

  private RoadmapNodeUpsertRequest requireNodeRequest(RoadmapNodeUpsertRequest request) {
    if (request == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return request;
  }

  private Roadmap getOfficialRoadmap(Long roadmapId) {
    if (roadmapId == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return roadmapRepository
        .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
        .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
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

  private String normalizeRequiredText(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value.trim();
  }

  private String normalizeNodeType(String value) {
    String nodeType = normalizeRequiredText(value).toUpperCase();

    if (!ALLOWED_NODE_TYPES.contains(nodeType)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return nodeType;
  }

  private String normalizeNullableText(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    return value.trim();
  }

  private Integer normalizeSortOrder(Integer value) {
    if (value == null || value < 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value;
  }

  private Integer normalizeOptionalNumber(Integer value) {
    if (value == null) {
      return null;
    }

    if (value < 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value;
  }

  // 노드별 필수 태그 이름을 표 렌더링용 맵으로 모은다.
  private Map<Long, List<String>> buildRequiredTagsMap(List<Long> nodeIds) {
    Map<Long, List<String>> requiredTagsByNodeId = new LinkedHashMap<>();

    for (NodeRequiredTagRepository.NodeRequiredTagNameProjection projection :
        nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds)) {
      requiredTagsByNodeId
          .computeIfAbsent(projection.getNodeId(), ignored -> new java.util.ArrayList<>())
          .add(projection.getTagName());
    }

    return requiredTagsByNodeId;
  }

  // 노드별 선행 노드 ID 목록을 관리자 표 렌더링용 맵으로 모은다.
  private Map<Long, List<Long>> buildPrerequisiteNodeIdsMap(List<Long> nodeIds) {
    Map<Long, List<Long>> prerequisiteNodeIdsByNodeId = new LinkedHashMap<>();

    for (PrerequisiteRepository.PrerequisiteNodeIdProjection projection :
        prerequisiteRepository.findPrerequisiteNodeIdsByNodeIds(nodeIds)) {
      prerequisiteNodeIdsByNodeId
          .computeIfAbsent(projection.getNodeId(), ignored -> new java.util.ArrayList<>())
          .add(projection.getPrerequisiteNodeId());
    }

    return prerequisiteNodeIdsByNodeId;
  }

  private AdminRoadmapNodeSummaryResponse toAdminRoadmapNodeSummary(
      RoadmapNode node,
      List<String> requiredTags,
      List<Long> prerequisiteNodeIds,
      NodeCompletionRule completionRule) {
    Integer requiredProgressRate = null;
    if (completionRule != null) {
      try {
        requiredProgressRate = Integer.valueOf(completionRule.getCriteriaValue());
      } catch (NumberFormatException ignored) {
        requiredProgressRate = null;
      }
    }

    return AdminRoadmapNodeSummaryResponse.builder()
        .nodeId(node.getNodeId())
        .roadmapId(node.getRoadmap().getRoadmapId())
        .roadmapTitle(node.getRoadmap().getTitle())
        .title(node.getTitle())
        .content(node.getContent())
        .nodeType(node.getNodeType())
        .sortOrder(node.getSortOrder())
        .subTopics(node.getSubTopics())
        .branchGroup(node.getBranchGroup())
        .prerequisiteNodeIds(prerequisiteNodeIds)
        .required(!requiredTags.isEmpty())
        .requiredTagCount(requiredTags.size())
        .requiredTags(requiredTags)
        .completionRuleDescription(completionRule == null ? null : completionRule.getCriteriaType())
        .requiredProgressRate(requiredProgressRate)
        .build();
  }
}

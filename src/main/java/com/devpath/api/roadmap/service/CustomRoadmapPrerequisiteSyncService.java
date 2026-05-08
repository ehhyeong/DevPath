package com.devpath.api.roadmap.service;

import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomRoadmapPrerequisiteSyncService {

  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  private final PrerequisiteRepository prerequisiteRepository;

  @Transactional
  public void ensurePrerequisites(CustomRoadmap customRoadmap) {
    List<CustomRoadmapNode> customNodes =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);
    ensurePrerequisites(customRoadmap, customNodes);
  }

  @Transactional
  public void ensurePrerequisites(
      CustomRoadmap customRoadmap, List<CustomRoadmapNode> customNodes) {
    if (customRoadmap.getOriginalRoadmap() == null || customNodes.isEmpty()) {
      return;
    }

    Map<Long, CustomRoadmapNode> customNodeById =
        customNodes.stream()
            .filter(node -> node.getId() != null)
            .collect(Collectors.toMap(CustomRoadmapNode::getId, Function.identity()));
    Map<Long, CustomRoadmapNode> customNodeByOriginalId =
        customNodes.stream()
            .filter(node -> node.getOriginalNode() != null)
            .collect(
                Collectors.toMap(node -> node.getOriginalNode().getNodeId(), Function.identity()));

    Set<EdgeKey> desiredEdges =
        resolveDesiredEdges(customRoadmap, customNodes, customNodeByOriginalId);

    if (desiredEdges.isEmpty()) {
      return;
    }

    Set<EdgeKey> existingEdges =
        customNodePrerequisiteRepository.findAllByCustomRoadmap(customRoadmap).stream()
            .map(
                prerequisite ->
                    new EdgeKey(
                        prerequisite.getCustomNode().getId(),
                        prerequisite.getPrerequisiteCustomNode().getId()))
            .collect(Collectors.toSet());

    List<CustomNodePrerequisite> missingPrerequisites =
        desiredEdges.stream()
            .filter(edge -> !existingEdges.contains(edge))
            .map(edge -> buildPrerequisite(customRoadmap, customNodeById, edge))
            .filter(Objects::nonNull)
            .toList();

    if (!missingPrerequisites.isEmpty()) {
      customNodePrerequisiteRepository.saveAll(missingPrerequisites);
    }
  }

  private Set<EdgeKey> resolveDesiredEdges(
      CustomRoadmap customRoadmap,
      List<CustomRoadmapNode> customNodes,
      Map<Long, CustomRoadmapNode> customNodeByOriginalId) {
    Long roadmapId = customRoadmap.getOriginalRoadmap().getRoadmapId();
    List<Prerequisite> officialPrerequisites =
        prerequisiteRepository.findAllByNodeRoadmapRoadmapId(roadmapId);

    if (!officialPrerequisites.isEmpty()) {
      Set<EdgeKey> officialEdges = new LinkedHashSet<>();

      for (Prerequisite prerequisite : officialPrerequisites) {
        CustomRoadmapNode node = customNodeByOriginalId.get(prerequisite.getNode().getNodeId());
        CustomRoadmapNode preNode =
            customNodeByOriginalId.get(prerequisite.getPreNode().getNodeId());
        addEdge(officialEdges, node, preNode);
      }

      return officialEdges;
    }

    return inferStructuralEdges(customNodes);
  }

  private Set<EdgeKey> inferStructuralEdges(List<CustomRoadmapNode> customNodes) {
    List<CustomRoadmapNode> orderedNodes =
        customNodes.stream()
            .filter(node -> node.getOriginalNode() != null)
            .sorted(nodeComparator())
            .toList();

    Set<EdgeKey> edges = new LinkedHashSet<>();
    List<CustomRoadmapNode> branchNodes =
        orderedNodes.stream().filter(node -> branchGroupOf(node) != null).toList();

    if (branchNodes.isEmpty()) {
      addLinearEdges(edges, orderedNodes);
      return edges;
    }

    int minBranchOrder =
        branchNodes.stream()
            .map(this::sortOrderOf)
            .filter(Objects::nonNull)
            .min(Integer::compareTo)
            .orElse(0);
    int maxBranchOrder =
        branchNodes.stream()
            .map(this::sortOrderOf)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0);

    List<CustomRoadmapNode> spineNodes =
        orderedNodes.stream().filter(node -> branchGroupOf(node) == null).toList();
    List<CustomRoadmapNode> preBranchSpineNodes =
        spineNodes.stream()
            .filter(node -> sortOrderOf(node) != null && sortOrderOf(node) < minBranchOrder)
            .toList();
    List<CustomRoadmapNode> postBranchSpineNodes =
        spineNodes.stream()
            .filter(node -> sortOrderOf(node) != null && sortOrderOf(node) > maxBranchOrder)
            .toList();

    addLinearEdges(edges, preBranchSpineNodes);

    CustomRoadmapNode splitSource =
        preBranchSpineNodes.isEmpty()
            ? null
            : preBranchSpineNodes.get(preBranchSpineNodes.size() - 1);
    List<CustomRoadmapNode> branchEndNodes = new ArrayList<>();

    Map<Integer, List<CustomRoadmapNode>> branchNodesByGroup =
        branchNodes.stream()
            .collect(Collectors.groupingBy(this::branchGroupOf, TreeMap::new, Collectors.toList()));

    for (List<CustomRoadmapNode> groupNodes : branchNodesByGroup.values()) {
      List<CustomRoadmapNode> orderedGroupNodes =
          groupNodes.stream().sorted(nodeComparator()).toList();

      if (orderedGroupNodes.isEmpty()) {
        continue;
      }

      addEdge(edges, orderedGroupNodes.get(0), splitSource);
      addLinearEdges(edges, orderedGroupNodes);
      branchEndNodes.add(orderedGroupNodes.get(orderedGroupNodes.size() - 1));
    }

    if (!postBranchSpineNodes.isEmpty()) {
      CustomRoadmapNode firstPostBranchNode = postBranchSpineNodes.get(0);
      for (CustomRoadmapNode branchEndNode : branchEndNodes) {
        addEdge(edges, firstPostBranchNode, branchEndNode);
      }
      addLinearEdges(edges, postBranchSpineNodes);
    }

    return edges;
  }

  private void addLinearEdges(Set<EdgeKey> edges, List<CustomRoadmapNode> nodes) {
    for (int index = 1; index < nodes.size(); index += 1) {
      addEdge(edges, nodes.get(index), nodes.get(index - 1));
    }
  }

  private void addEdge(
      Set<EdgeKey> edges, CustomRoadmapNode node, CustomRoadmapNode prerequisiteNode) {
    if (node == null || prerequisiteNode == null) {
      return;
    }

    Long nodeId = node.getId();
    Long prerequisiteNodeId = prerequisiteNode.getId();

    if (nodeId == null || prerequisiteNodeId == null || nodeId.equals(prerequisiteNodeId)) {
      return;
    }

    edges.add(new EdgeKey(nodeId, prerequisiteNodeId));
  }

  private CustomNodePrerequisite buildPrerequisite(
      CustomRoadmap customRoadmap, Map<Long, CustomRoadmapNode> customNodeById, EdgeKey edge) {
    CustomRoadmapNode node = customNodeById.get(edge.nodeId());
    CustomRoadmapNode prerequisiteNode = customNodeById.get(edge.prerequisiteNodeId());

    if (node == null || prerequisiteNode == null) {
      return null;
    }

    return CustomNodePrerequisite.builder()
        .customRoadmap(customRoadmap)
        .customNode(node)
        .prerequisiteCustomNode(prerequisiteNode)
        .build();
  }

  private Comparator<CustomRoadmapNode> nodeComparator() {
    return Comparator.comparing(this::sortOrderOf, Comparator.nullsLast(Integer::compareTo))
        .thenComparing(CustomRoadmapNode::getId, Comparator.nullsLast(Long::compareTo));
  }

  private Integer sortOrderOf(CustomRoadmapNode node) {
    if (node.getOriginalNode() != null && node.getOriginalNode().getSortOrder() != null) {
      return node.getOriginalNode().getSortOrder();
    }

    return node.getCustomSortOrder();
  }

  private Integer branchGroupOf(CustomRoadmapNode node) {
    return node.getOriginalNode() != null ? node.getOriginalNode().getBranchGroup() : null;
  }

  private record EdgeKey(Long nodeId, Long prerequisiteNodeId) {}
}

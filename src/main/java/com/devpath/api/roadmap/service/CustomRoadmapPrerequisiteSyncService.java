package com.devpath.api.roadmap.service;

import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
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

/**
 * 커스텀 로드맵의 선행관계(prereq) 그래프를 만드는 단일 서비스. 모든 진입점(복사·조회·클리어·순서변경·분기편집)이 동일한 규칙으로 그래프를 전량
 * 재생성하므로 경로별 불일치가 발생하지 않는다.
 *
 * <p>그래프 규칙:
 *
 * <ul>
 *   <li>척추 노드(분기 아님): 선행 = customSortOrder상 직전 척추 노드 하나.
 *   <li>추천 분기(branchFromNodeId != null): 선행 = 앵커(branchFromNodeId가 가리키는 커스텀 노드)에 직접. 각각 독립 선택지.
 *   <li>위치기반 분기(effectiveBranchGroup != null, 빌더/공식 좌·우 분기): 같은 그룹을 customSortOrder순 체인, 첫 노드는 분기
 *       시작 직전 척추가 앵커.
 *   <li>합류(merge) 없음 — 분기는 본류(척추) 진행을 막지 않는 순수 선택지. 앵커만 완료하면 분기를 건너뛰고 다음 척추로 진행할 수 있다.
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class CustomRoadmapPrerequisiteSyncService {

  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;

  @Transactional
  public void ensurePrerequisites(CustomRoadmap customRoadmap) {
    rebuild(
        customRoadmap,
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap));
  }

  @Transactional
  public void ensurePrerequisites(
      CustomRoadmap customRoadmap, List<CustomRoadmapNode> customNodes) {
    rebuild(customRoadmap, customNodes);
  }

  /** 현재 customSortOrder + 분기 구조 기준으로 선행관계 그래프를 전부 재생성한다. */
  @Transactional
  public void rebuildFromCurrentOrder(CustomRoadmap customRoadmap) {
    rebuild(
        customRoadmap,
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap));
  }

  // 기존 엣지를 모두 삭제하고 현재 노드 구성으로 그래프를 다시 만든다.
  private void rebuild(CustomRoadmap customRoadmap, List<CustomRoadmapNode> customNodes) {
    customNodePrerequisiteRepository.deleteAllByCustomRoadmap(customRoadmap);

    if (customNodes.isEmpty()) {
      return;
    }

    Map<Long, CustomRoadmapNode> customNodeById =
        customNodes.stream()
            .filter(node -> node.getId() != null)
            .collect(Collectors.toMap(CustomRoadmapNode::getId, Function.identity()));

    List<CustomNodePrerequisite> edges =
        buildDesiredEdges(customNodes).stream()
            .map(edge -> buildPrerequisite(customRoadmap, customNodeById, edge))
            .filter(Objects::nonNull)
            .toList();

    if (!edges.isEmpty()) {
      customNodePrerequisiteRepository.saveAll(edges);
    }
  }

  // customSortOrder + 분기 구조에서 선행 엣지를 도출한다.
  private Set<EdgeKey> buildDesiredEdges(List<CustomRoadmapNode> customNodes) {
    Comparator<CustomRoadmapNode> byOrder =
        Comparator.comparing(
                CustomRoadmapNode::getCustomSortOrder, Comparator.nullsLast(Integer::compareTo))
            .thenComparing(CustomRoadmapNode::getId, Comparator.nullsLast(Long::compareTo));
    List<CustomRoadmapNode> ordered = customNodes.stream().sorted(byOrder).toList();

    Set<EdgeKey> edges = new LinkedHashSet<>();

    // 1) 척추(분기 아님) 선형 연결
    List<CustomRoadmapNode> spine = ordered.stream().filter(node -> !isBranch(node)).toList();
    addLinearEdges(edges, spine);

    // 2) 추천 분기: 앵커(branchFromNodeId가 가리키는 커스텀 노드)에 직접 연결(체인 없음)
    Map<Long, CustomRoadmapNode> nodeByOriginalId =
        customNodes.stream()
            .filter(node -> node.getOriginalNode() != null)
            .collect(
                Collectors.toMap(
                    node -> node.getOriginalNode().getNodeId(), Function.identity(), (a, b) -> a));
    for (CustomRoadmapNode branch : ordered) {
      if (branch.getBranchFromNodeId() == null) {
        continue;
      }
      addEdge(edges, branch, nodeByOriginalId.get(branch.getBranchFromNodeId()));
    }

    // 3) 위치기반 분기(빌더/공식 좌·우 분기): 같은 그룹 체인 + 그룹 시작 직전 척추가 앵커
    Map<Integer, List<CustomRoadmapNode>> positionalGroups =
        ordered.stream()
            .filter(
                node ->
                    node.getBranchFromNodeId() == null && node.effectiveBranchGroup() != null)
            .collect(
                Collectors.groupingBy(
                    CustomRoadmapNode::effectiveBranchGroup, TreeMap::new, Collectors.toList()));
    for (List<CustomRoadmapNode> group : positionalGroups.values()) {
      List<CustomRoadmapNode> groupNodes = group.stream().sorted(byOrder).toList();
      if (groupNodes.isEmpty()) {
        continue;
      }
      addEdge(edges, groupNodes.get(0), lastSpineNodeBefore(spine, groupNodes.get(0), byOrder));
      addLinearEdges(edges, groupNodes);
    }

    return edges;
  }

  private boolean isBranch(CustomRoadmapNode node) {
    return node.getBranchFromNodeId() != null || node.effectiveBranchGroup() != null;
  }

  // spine(이미 customSortOrder 정렬) 중 target보다 앞선 마지막 척추 노드(없으면 null = 앵커 없음).
  private CustomRoadmapNode lastSpineNodeBefore(
      List<CustomRoadmapNode> spine,
      CustomRoadmapNode target,
      Comparator<CustomRoadmapNode> byOrder) {
    CustomRoadmapNode anchor = null;
    for (CustomRoadmapNode node : spine) {
      if (byOrder.compare(node, target) < 0) {
        anchor = node;
      } else {
        break;
      }
    }
    return anchor;
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

  private record EdgeKey(Long nodeId, Long prerequisiteNodeId) {}
}
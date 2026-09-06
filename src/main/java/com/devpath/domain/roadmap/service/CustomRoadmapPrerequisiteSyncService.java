package com.devpath.domain.roadmap.service;

import com.devpath.domain.roadmap.entity.BranchKind;
import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
 * 커스텀 로드맵의 선행관계(prereq) 그래프를 만드는 단일 서비스. 모든 진입점(복사·조회·클리어·순서변경·분기편집)이 동일한 규칙으로 그래프를 전량 재생성하므로 경로별
 * 불일치가 발생하지 않는다.
 *
 * <p>로드맵 단위로 두 모델을 듀얼리드한다(TASK-56):
 *
 * <ul>
 *   <li><b>레인 모델</b>(노드에 branchKind 존재): 레인=(anchorNodeId, laneKey) 체인. 첫 노드 선행=앵커 커스텀 노드, 나머지=레인 내
 *       직전 노드. 위치 노드(SPINE/BRANCH)의 레인 필드는 수동편집 후 {@code relayoutLanes}가 customSortOrder+구조그룹에서
 *       재도출하고, 앵커 분기(REVIEW/ADVANCED)는 anchorNodeId 원본값을 보존한다.
 *   <li><b>레거시 모델</b>(branchKind 전무): 옛 필드 기반. 척추=직전 척추, 추천 분기=branchFromNodeId 앵커, 위치
 *       분기=effectiveBranchGroup. 복사 로드맵이 레인화(P4)되기 전까지만 사용한다(합류 미지원, AND).
 * </ul>
 *
 * <p>분기 두 종류(레인 모델):
 *
 * <ul>
 *   <li><b>유형 A 곁가지</b>(REVIEW/ADVANCED): 앵커 옆 선택 노드. 선행=앵커, 아무도 이 노드를 선행으로 두지 않음(합류 없음).
 *   <li><b>유형 B 갈림길</b>(BRANCH): 앵커에서 병렬 레인 ≥1로 갈라져 <b>다음 척추에서 OR 합류</b>. 다음 척추의 선행 = 각 갈래 끝들의 한
 *       그룹(OR) → 한 갈래만 완료해도 진행 가능. 앵커→다음척추 직결 엣지는 만들지 않는다.
 * </ul>
 *
 * <p>선행 판정은 CNF: prereqGroup이 같은 엣지끼리 OR, 다른 그룹끼리 AND. 일반 선형 엣지는 각자 단독 그룹이라 AND와 같다.
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

  /**
   * 수동편집(이동·분기재배치·삭제) 후 호출한다. 레인 모델 로드맵은 flat(customSortOrder + 구조그룹)에서 레인 필드를 재도출한 뒤 그래프를 재생성하고,
   * 레거시 로드맵은 기존대로 customSortOrder 기준으로만 재생성한다(TASK-56 P6).
   */
  @Transactional
  public void relayoutAndRebuild(CustomRoadmap customRoadmap) {
    List<CustomRoadmapNode> nodes =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);
    relayoutLanes(nodes);
    rebuild(customRoadmap, nodes);
  }

  // 위치 노드(SPINE/구조 BRANCH)의 레인 필드를 customSortOrder + 구조그룹에서 재도출한다.
  // REVIEW/ADVANCED 앵커 분기는 anchorNodeId로 매달리므로 제외(보존)한다.
  private void relayoutLanes(List<CustomRoadmapNode> nodes) {
    Comparator<CustomRoadmapNode> byOrder =
        Comparator.comparing(
                CustomRoadmapNode::getCustomSortOrder, Comparator.nullsLast(Integer::compareTo))
            .thenComparing(CustomRoadmapNode::getId, Comparator.nullsLast(Long::compareTo));
    List<CustomRoadmapNode> positional =
        nodes.stream().filter(this::isPositional).sorted(byOrder).toList();
    // 각 노드는 그룹을 읽은 직후 한 번만 갱신하므로 스냅샷 없이 laneKey를 바로 읽어도 안전하다.
    assignPositionalLanes(
        positional, node -> node.getBranchKind() == BranchKind.BRANCH ? node.getLaneKey() : null);
  }

  // 아직 레인이 배정되지 않은 노드(추천·채용 등이 새로 붙인 노드)도 위치 노드로 보고 척추에 편입한다.
  private boolean isPositional(CustomRoadmapNode node) {
    BranchKind kind = node.getBranchKind();
    return kind == null || kind == BranchKind.SPINE || kind == BranchKind.BRANCH;
  }

  /**
   * 레인 필드를 권위값으로 삼아 전역 표시순서(customSortOrder)를 레인 트리 DFS preorder로 재부여한 뒤 그래프를 재생성한다. 레인을 직접 조작하는
   * 편집(lane-aware moveNode)이 호출한다. (relayout과 반대 방향: 레인→순서)
   */
  @Transactional
  public void recomputeOrderAndRebuild(CustomRoadmap customRoadmap) {
    List<CustomRoadmapNode> nodes =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);
    if (nodes.stream().anyMatch(CustomRoadmapNode::isLaneModeled)) {
      Map<Long, List<CustomRoadmapNode>> childrenByAnchor =
          nodes.stream()
              .filter(node -> node.getAnchorNodeId() != null)
              .collect(Collectors.groupingBy(CustomRoadmapNode::getAnchorNodeId));
      Comparator<CustomRoadmapNode> childOrder =
          Comparator.comparing(
                  CustomRoadmapNode::getOrderInLane, Comparator.nullsLast(Integer::compareTo))
              .thenComparing(
                  CustomRoadmapNode::getLaneKey, Comparator.nullsLast(Integer::compareTo))
              .thenComparing(CustomRoadmapNode::getId, Comparator.nullsLast(Long::compareTo));
      int[] counter = {1};
      nodes.stream()
          .filter(node -> node.getAnchorNodeId() == null)
          .sorted(
              Comparator.comparing(
                      CustomRoadmapNode::getOrderInLane, Comparator.nullsLast(Integer::compareTo))
                  .thenComparing(CustomRoadmapNode::getId, Comparator.nullsLast(Long::compareTo)))
          .forEach(root -> dfsAssignOrder(root, childrenByAnchor, childOrder, counter));
    }
    rebuild(customRoadmap, nodes);
  }

  // 노드에 순번을 부여하고 자식(앵커가 이 노드인 노드들)을 재귀로 잇는다(DFS preorder).
  private void dfsAssignOrder(
      CustomRoadmapNode node,
      Map<Long, List<CustomRoadmapNode>> childrenByAnchor,
      Comparator<CustomRoadmapNode> childOrder,
      int[] counter) {
    node.changeCustomSortOrder(counter[0]);
    counter[0] += 1;
    childrenByAnchor.getOrDefault(node.getId(), List.of()).stream()
        .sorted(childOrder)
        .forEach(child -> dfsAssignOrder(child, childrenByAnchor, childOrder, counter));
  }

  /**
   * 위치 노드(SPINE/구조 BRANCH)에 레인 필드를 일괄 배치한다. {@code orderedPositional}은 표시 순서(customSortOrder)대로 정렬된
   * 위치 노드들이고, {@code groupOf}는 각 노드의 구조 분기 그룹(null=척추, 1/2=좌·우)을 돌려준다. 척추=직전 척추 앵커, 분기=그룹 시작 직전 척추
   * 앵커로 잇는다. 빌더 저장과 수동편집 재배치가 공유하는 단일 도출 로직이다(순수 함수).
   */
  public static void assignPositionalLanes(
      List<CustomRoadmapNode> orderedPositional, Function<CustomRoadmapNode, Integer> groupOf) {
    CustomRoadmapNode lastSpine = null;
    int spineOrder = 0;
    Map<String, Integer> laneOrderCounters = new HashMap<>();
    for (CustomRoadmapNode node : orderedPositional) {
      Integer group = groupOf.apply(node);
      if (group == null) {
        node.assignLane(BranchKind.SPINE, null, null, spineOrder);
        spineOrder += 1;
        lastSpine = node;
      } else {
        Long anchorId = lastSpine != null ? lastSpine.getId() : null;
        int orderInLane = laneOrderCounters.merge(anchorId + ":" + group, 1, Integer::sum) - 1;
        node.assignLane(BranchKind.BRANCH, anchorId, group, orderInLane);
      }
    }
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

  // 로드맵 단위로 모델을 판별해 그래프 도출 방식을 분기한다(TASK-56 듀얼리드).
  // 노드 중 하나라도 레인 모델이면 레인 경로(P3+ writer는 SPINE 포함 전 노드에 branchKind 채움).
  private Set<EdgeKey> buildDesiredEdges(List<CustomRoadmapNode> customNodes) {
    boolean laneModeled = customNodes.stream().anyMatch(CustomRoadmapNode::isLaneModeled);
    return laneModeled ? buildLaneEdges(customNodes) : buildLegacyEdges(customNodes);
  }

  // 레인 모델: 레인=(anchorNodeId, laneKey) 체인. 첫 노드 선행=앵커, 나머지=레인 내 직전 노드.
  // 유형 A(REVIEW/ADVANCED)=무합류. 유형 B(BRANCH)=다음 척추에서 OR 합류(척추 X→Y 직결 대신 갈래 끝들 한 그룹).
  private Set<EdgeKey> buildLaneEdges(List<CustomRoadmapNode> customNodes) {
    Map<Long, CustomRoadmapNode> customNodeById =
        customNodes.stream()
            .filter(node -> node.getId() != null)
            .collect(Collectors.toMap(CustomRoadmapNode::getId, Function.identity()));

    Comparator<CustomRoadmapNode> byLaneOrder =
        Comparator.comparing(
                CustomRoadmapNode::getOrderInLane, Comparator.nullsLast(Integer::compareTo))
            .thenComparing(CustomRoadmapNode::getId, Comparator.nullsLast(Long::compareTo));

    // 앵커 레인((anchorNodeId, laneKey))별로 묶는다. 척추 레인(anchorNodeId=null)은 별도로 합류까지 처리한다.
    Map<LaneKey, List<CustomRoadmapNode>> lanes =
        customNodes.stream()
            .collect(
                Collectors.groupingBy(
                    node -> new LaneKey(node.getAnchorNodeId(), node.getLaneKey()),
                    LinkedHashMap::new,
                    Collectors.toList()));

    int[] groupSeq = {0};
    Set<EdgeKey> edges = new LinkedHashSet<>();
    // 앵커 X별 BRANCH 갈래 끝 노드들(합류 소스). 척추 다음 노드가 OR로 매달린다.
    Map<Long, List<CustomRoadmapNode>> branchLaneEndsByAnchor = new LinkedHashMap<>();

    for (Map.Entry<LaneKey, List<CustomRoadmapNode>> entry : lanes.entrySet()) {
      if (entry.getKey().anchorNodeId() == null) {
        continue; // 척추 레인은 아래에서 합류와 함께 처리
      }
      List<CustomRoadmapNode> laneNodes = entry.getValue().stream().sorted(byLaneOrder).toList();
      if (laneNodes.isEmpty()) {
        continue;
      }
      CustomRoadmapNode anchor = customNodeById.get(entry.getKey().anchorNodeId());
      addEdge(edges, laneNodes.get(0), anchor, groupSeq[0]++);
      addLinearEdges(edges, laneNodes, groupSeq);
      if (laneNodes.get(0).getBranchKind() == BranchKind.BRANCH) {
        branchLaneEndsByAnchor
            .computeIfAbsent(entry.getKey().anchorNodeId(), key -> new java.util.ArrayList<>())
            .add(laneNodes.get(laneNodes.size() - 1));
      }
    }

    // 척추 연속쌍 (X,Y): X에 BRANCH 갈래가 있으면 Y 선행 = 갈래 끝들의 OR 그룹(X→Y 직결 없음),
    // 없으면 Y 선행 = X(단독 그룹). 첫 척추는 선행 없음.
    List<CustomRoadmapNode> spine =
        customNodes.stream()
            .filter(node -> node.getBranchKind() == BranchKind.SPINE)
            .sorted(byLaneOrder)
            .toList();
    for (int index = 1; index < spine.size(); index += 1) {
      CustomRoadmapNode y = spine.get(index);
      CustomRoadmapNode x = spine.get(index - 1);
      List<CustomRoadmapNode> ends = branchLaneEndsByAnchor.get(x.getId());
      if (ends != null && !ends.isEmpty()) {
        int mergeGroup = groupSeq[0]++;
        for (CustomRoadmapNode end : ends) {
          addEdge(edges, y, end, mergeGroup);
        }
      } else {
        addEdge(edges, y, x, groupSeq[0]++);
      }
    }
    return edges;
  }

  // 레거시 모델: customSortOrder + 옛 분기 구조에서 선행 엣지를 도출한다.
  private Set<EdgeKey> buildLegacyEdges(List<CustomRoadmapNode> customNodes) {
    Comparator<CustomRoadmapNode> byOrder =
        Comparator.comparing(
                CustomRoadmapNode::getCustomSortOrder, Comparator.nullsLast(Integer::compareTo))
            .thenComparing(CustomRoadmapNode::getId, Comparator.nullsLast(Long::compareTo));
    List<CustomRoadmapNode> ordered = customNodes.stream().sorted(byOrder).toList();

    Set<EdgeKey> edges = new LinkedHashSet<>();
    int[] groupSeq = {0}; // 레거시는 합류 없음 — 엣지마다 단독 그룹(AND) 부여.

    // 1) 척추(분기 아님) 선형 연결
    List<CustomRoadmapNode> spine = ordered.stream().filter(node -> !isBranch(node)).toList();
    addLinearEdges(edges, spine, groupSeq);

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
      addEdge(edges, branch, nodeByOriginalId.get(branch.getBranchFromNodeId()), groupSeq[0]++);
    }

    // 3) 위치기반 분기(빌더/공식 좌·우 분기): 같은 그룹 체인 + 그룹 시작 직전 척추가 앵커
    Map<Integer, List<CustomRoadmapNode>> positionalGroups =
        ordered.stream()
            .filter(
                node -> node.getBranchFromNodeId() == null && node.effectiveBranchGroup() != null)
            .collect(
                Collectors.groupingBy(
                    CustomRoadmapNode::effectiveBranchGroup, TreeMap::new, Collectors.toList()));
    for (List<CustomRoadmapNode> group : positionalGroups.values()) {
      List<CustomRoadmapNode> groupNodes = group.stream().sorted(byOrder).toList();
      if (groupNodes.isEmpty()) {
        continue;
      }
      addEdge(
          edges,
          groupNodes.get(0),
          lastSpineNodeBefore(spine, groupNodes.get(0), byOrder),
          groupSeq[0]++);
      addLinearEdges(edges, groupNodes, groupSeq);
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

  // 선형 체인. 각 엣지는 단독 그룹(AND). 합류는 호출 측이 별도 OR 그룹으로 만든다.
  private void addLinearEdges(Set<EdgeKey> edges, List<CustomRoadmapNode> nodes, int[] groupSeq) {
    for (int index = 1; index < nodes.size(); index += 1) {
      addEdge(edges, nodes.get(index), nodes.get(index - 1), groupSeq[0]++);
    }
  }

  private void addEdge(
      Set<EdgeKey> edges, CustomRoadmapNode node, CustomRoadmapNode prerequisiteNode, int group) {
    if (node == null || prerequisiteNode == null) {
      return;
    }

    Long nodeId = node.getId();
    Long prerequisiteNodeId = prerequisiteNode.getId();

    if (nodeId == null || prerequisiteNodeId == null || nodeId.equals(prerequisiteNodeId)) {
      return;
    }

    edges.add(new EdgeKey(nodeId, prerequisiteNodeId, group));
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
        .prereqGroup(edge.group())
        .build();
  }

  private record EdgeKey(Long nodeId, Long prerequisiteNodeId, int group) {}

  // 레인 식별자: (앵커 커스텀 노드 id, 형제 레인 구분키). 루트척추는 (null, null).
  private record LaneKey(Long anchorNodeId, Integer laneKey) {}
}

package com.devpath.api.roadmap.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.BranchKind;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 학습자가 커스텀 로드맵 노드를 직접 보류(defer)·삭제·순서변경하는 명령 서비스. */
@Service
@RequiredArgsConstructor
public class CustomRoadmapNodeCommandService {

  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  private final RoadmapProgressService roadmapProgressService;
  private final CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;

  /** 노드 보류 설정/해제. 보류 시 완료하지 않아도 다음 노드 진행이 허용된다(미완료 상태 유지). */
  @Transactional
  public void setDeferred(Long userId, Long customRoadmapId, Long customNodeId, boolean deferred) {
    CustomRoadmapNode customNode = getOwnedNode(userId, customRoadmapId, customNodeId);

    if (customNode.getStatus() == NodeStatus.COMPLETED) {
      throw new CustomException(ErrorCode.NODE_ALREADY_COMPLETED);
    }

    if (deferred) {
      customNode.defer();
    } else {
      customNode.undefer();
    }
  }

  /**
   * 노드 삭제. 이 노드에 매달린 복습/심화(REVIEW/ADVANCED) 자식은 함께 삭제(cascade)하고, 구조 분기 자식은 relayout이 직전 척추로
   * 재앵커한다. 선행관계 간선을 함께 정리하고 진행률을 재계산한다.
   */
  @Transactional
  public void deleteNode(Long userId, Long customRoadmapId, Long customNodeId) {
    CustomRoadmapNode customNode = getOwnedNode(userId, customRoadmapId, customNodeId);
    CustomRoadmap customRoadmap = customNode.getCustomRoadmap();

    // cascade: 이 노드를 앵커로 매달린 복습/심화 자식 노드를 함께 삭제한다(부모 없으면 의미가 사라짐).
    List<CustomRoadmapNode> reviewChildren =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap)
            .stream()
            .filter(
                n ->
                    Objects.equals(n.getAnchorNodeId(), customNode.getId())
                        && (n.getBranchKind() == BranchKind.REVIEW
                            || n.getBranchKind() == BranchKind.ADVANCED))
            .collect(Collectors.toList());
    for (CustomRoadmapNode child : reviewChildren) {
      customNodePrerequisiteRepository.deleteAllByCustomNodeOrPrerequisiteCustomNode(child);
      customRoadmapNodeRepository.delete(child);
    }

    customNodePrerequisiteRepository.deleteAllByCustomNodeOrPrerequisiteCustomNode(customNode);
    customRoadmapNodeRepository.delete(customNode);

    // 삭제 후 남은 노드 기준으로 레인/선행관계를 재구성한다(앵커가 사라진 분기 재배치 포함).
    prerequisiteSyncService.relayoutAndRebuild(customRoadmap);

    long total = customRoadmapNodeRepository.countByCustomRoadmap(customRoadmap);
    long completed =
        customRoadmapNodeRepository.countByCustomRoadmapAndStatus(
            customRoadmap, NodeStatus.COMPLETED);
    roadmapProgressService.updateProgressRate(customRoadmap, total, completed);
  }

  /**
   * 노드를 한 칸 위/아래로 이동한다. 레인 모델 로드맵은 레인 규칙으로 이동한다: 같은 레인(분기 체인) 내에서는 순서변경, 레인 경계에서 더 밀면 그
   * 층(layer)의 분기가 척추로 이탈한다. 레거시 로드맵은 기존 customSortOrder 스왑. 진행상태는 보존된다.
   */
  @Transactional
  public void moveNode(Long userId, Long customRoadmapId, Long customNodeId, boolean up) {
    CustomRoadmapNode node = getOwnedNode(userId, customRoadmapId, customNodeId);
    CustomRoadmap customRoadmap = node.getCustomRoadmap();

    List<CustomRoadmapNode> all =
        new ArrayList<>(
            customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(
                customRoadmap));

    if (all.stream().noneMatch(CustomRoadmapNode::isLaneModeled)) {
      moveLegacy(customRoadmap, node, up);
      return;
    }
    if (!moveLaneNode(all, node, up)) {
      return; // 경계 등 변경 없음
    }
    prerequisiteSyncService.recomputeOrderAndRebuild(customRoadmap);
    customRoadmap.markPrerequisitesCustomized();
  }

  // 레거시 로드맵: 기존 customSortOrder 리스트 스왑 방식.
  private void moveLegacy(CustomRoadmap customRoadmap, CustomRoadmapNode node, boolean up) {
    List<CustomRoadmapNode> ordered =
        new ArrayList<>(
            customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(
                customRoadmap));
    int index = indexOfId(ordered, node.getId());
    int neighborIndex = up ? index - 1 : index + 1;
    if (index < 0 || neighborIndex < 0 || neighborIndex >= ordered.size()) {
      return;
    }
    ordered.remove(index);
    ordered.add(neighborIndex, node);
    finalizeReorder(customRoadmap, ordered);
  }

  // 레인 모델 이동. 변경이 있으면 true. 레인 필드를 직접 조작하며, 호출 측이 recomputeOrderAndRebuild로 순서·그래프를 재생성한다.
  private boolean moveLaneNode(List<CustomRoadmapNode> all, CustomRoadmapNode node, boolean up) {
    BranchKind kind = node.getBranchKind();
    if (kind == BranchKind.REVIEW || kind == BranchKind.ADVANCED) {
      return false; // 추천 분기는 이동 대상 아님(앵커 고정)
    }
    if (kind == BranchKind.SPINE) {
      List<CustomRoadmapNode> spine = sortByOrderInLane(filterByKind(all, BranchKind.SPINE));
      int i = indexOfId(spine, node.getId());
      int j = up ? i - 1 : i + 1;
      if (j < 0 || j >= spine.size()) {
        return false; // 경계
      }
      swapOrderInLane(node, spine.get(j));
      return true;
    }
    // 구조 분기(BRANCH)
    List<CustomRoadmapNode> lane =
        sortByOrderInLane(
            all.stream()
                .filter(
                    n ->
                        n.getBranchKind() == BranchKind.BRANCH
                            && Objects.equals(n.getAnchorNodeId(), node.getAnchorNodeId())
                            && Objects.equals(n.getLaneKey(), node.getLaneKey()))
                .collect(Collectors.toList()));
    int pos = indexOfId(lane, node.getId());
    int nbr = up ? pos - 1 : pos + 1;
    if (nbr >= 0 && nbr < lane.size()) {
      swapOrderInLane(node, lane.get(nbr)); // 레인 내 순서변경(분기 유지)
      return true;
    }
    exitLayer(all, node, up); // 레인 경계 → 층 이탈(척추로 전환)
    return true;
  }

  // 분기 노드가 레인 경계에서 이탈할 때: 같은 앵커의 같은 층(orderInLane) 노드들을 척추로 전환해 앵커 바로 뒤에 끼우고,
  // 더 깊은 층은 마지막 이탈 노드로 재앵커한다(이동 방향대로 형제 위/아래 배치).
  private void exitLayer(List<CustomRoadmapNode> all, CustomRoadmapNode node, boolean up) {
    Long anchorId = node.getAnchorNodeId();
    int k = node.getOrderInLane() != null ? node.getOrderInLane() : 0;

    List<CustomRoadmapNode> exitOrdered =
        all.stream()
            .filter(
                n ->
                    n.getBranchKind() == BranchKind.BRANCH
                        && Objects.equals(n.getAnchorNodeId(), anchorId)
                        && n.getOrderInLane() != null
                        && n.getOrderInLane() == k)
            .sorted(
                Comparator.comparing(
                    CustomRoadmapNode::getLaneKey, Comparator.nullsLast(Integer::compareTo)))
            .collect(Collectors.toCollection(ArrayList::new));
    exitOrdered.remove(node);
    if (up) {
      exitOrdered.add(0, node);
    } else {
      exitOrdered.add(node);
    }

    List<CustomRoadmapNode> below =
        all.stream()
            .filter(
                n ->
                    n.getBranchKind() == BranchKind.BRANCH
                        && Objects.equals(n.getAnchorNodeId(), anchorId)
                        && n.getOrderInLane() != null
                        && n.getOrderInLane() > k)
            .collect(Collectors.toList());

    // 새 척추 시퀀스: 앵커 바로 뒤에 이탈 노드들을 삽입하고 0..N으로 재번호(이탈 노드는 SPINE 전환).
    List<CustomRoadmapNode> spine = sortByOrderInLane(filterByKind(all, BranchKind.SPINE));
    int ai = indexOfId(spine, anchorId);
    if (ai < 0) {
      ai = spine.size() - 1;
    }
    spine.addAll(ai + 1, exitOrdered);
    for (int i = 0; i < spine.size(); i += 1) {
      spine.get(i).assignLane(BranchKind.SPINE, null, null, i);
    }

    // 더 깊은 층은 마지막 이탈 노드로 재앵커하고 층 번호를 0부터로 당긴다.
    CustomRoadmapNode newAnchor = exitOrdered.get(exitOrdered.size() - 1);
    for (CustomRoadmapNode b : below) {
      b.assignLane(BranchKind.BRANCH, newAnchor.getId(), b.getLaneKey(), b.getOrderInLane() - (k + 1));
    }
  }

  private List<CustomRoadmapNode> filterByKind(List<CustomRoadmapNode> all, BranchKind kind) {
    return all.stream().filter(n -> n.getBranchKind() == kind).collect(Collectors.toList());
  }

  private List<CustomRoadmapNode> sortByOrderInLane(List<CustomRoadmapNode> nodes) {
    nodes.sort(
        Comparator.comparing(
                CustomRoadmapNode::getOrderInLane, Comparator.nullsLast(Integer::compareTo))
            .thenComparing(CustomRoadmapNode::getId, Comparator.nullsLast(Long::compareTo)));
    return nodes;
  }

  private int indexOfId(List<CustomRoadmapNode> list, Long id) {
    for (int i = 0; i < list.size(); i += 1) {
      if (id.equals(list.get(i).getId())) {
        return i;
      }
    }
    return -1;
  }

  private void swapOrderInLane(CustomRoadmapNode a, CustomRoadmapNode b) {
    Integer oa = a.getOrderInLane();
    Integer ob = b.getOrderInLane();
    a.assignLane(a.getBranchKind(), a.getAnchorNodeId(), a.getLaneKey(), ob);
    b.assignLane(b.getBranchKind(), b.getAnchorNodeId(), b.getLaneKey(), oa);
  }

  /**
   * 이동 노드를 앵커 노드 '바로 뒤'(앵커가 null이면 맨 앞)로 옮긴다. AI 순서변경 제안(REORDER) 적용에서 호출한다. 호출 측에서
   * 소유권/존재를 보장한 엔티티를 넘긴다.
   */
  @Transactional
  public void reorderAfter(
      CustomRoadmap customRoadmap, CustomRoadmapNode moved, CustomRoadmapNode anchorOrNull) {
    List<CustomRoadmapNode> ordered =
        new ArrayList<>(
            customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(
                customRoadmap));

    ordered.removeIf(n -> n.getId().equals(moved.getId()));

    int insertAt = 0;
    if (anchorOrNull != null) {
      for (int i = 0; i < ordered.size(); i += 1) {
        if (ordered.get(i).getId().equals(anchorOrNull.getId())) {
          insertAt = i + 1;
          break;
        }
      }
    }
    ordered.add(insertAt, moved);
    finalizeReorder(customRoadmap, ordered);
  }

  /**
   * 노드의 분기 소속을 변경한다(null=척추, 1=왼쪽, 2=오른쪽). 첫 분기 편집 시 모든 노드의 현재 유효 분기값을 override로 백필해
   * 기존 분기 구성을 보존한 뒤 편집본으로 전환한다. 변경 후 현재 순서·분기 기준으로 선행관계를 재생성한다.
   */
  @Transactional
  public void setNodeBranch(
      Long userId, Long customRoadmapId, Long customNodeId, Integer branchGroup) {
    if (branchGroup != null && branchGroup != 1 && branchGroup != 2) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "branchGroup must be null, 1, or 2.");
    }

    CustomRoadmapNode node = getOwnedNode(userId, customRoadmapId, customNodeId);
    CustomRoadmap customRoadmap = node.getCustomRoadmap();

    List<CustomRoadmapNode> nodes =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);
    boolean laneModeled = nodes.stream().anyMatch(CustomRoadmapNode::isLaneModeled);

    if (laneModeled) {
      // 레인 로드맵: 편집 노드의 구조그룹만 세팅하고 relayout이 앵커/순서를 재도출한다.
      if (branchGroup == null) {
        node.assignLane(BranchKind.SPINE, null, null, node.getOrderInLane());
      } else {
        node.assignLane(
            BranchKind.BRANCH, node.getAnchorNodeId(), branchGroup, node.getOrderInLane());
      }
      prerequisiteSyncService.relayoutAndRebuild(customRoadmap);
    } else {
      // 레거시 로드맵: 기존 override 백필 경로 유지.
      backfillBranchGroupsIfNeeded(customRoadmap);
      node.setBranchGroupOverride(branchGroup);
      prerequisiteSyncService.rebuildFromCurrentOrder(customRoadmap);
    }
    customRoadmap.markPrerequisitesCustomized();
  }

  // 분기 편집본 전환 전, 모든 노드의 현재 유효 분기값을 override 컬럼에 백필해 기존 분기 구성을 보존한다.
  private void backfillBranchGroupsIfNeeded(CustomRoadmap customRoadmap) {
    if (customRoadmap.isBranchesCustomized()) {
      return;
    }
    List<CustomRoadmapNode> nodes =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);
    for (CustomRoadmapNode n : nodes) {
      n.setBranchGroupOverride(n.effectiveBranchGroup()); // 플래그 false라 원본 유효값을 반환
    }
    customRoadmap.markBranchesCustomized();
  }

  // 재배치된 리스트를 1..N으로 재번호 매기고 선행관계 그래프를 재생성한 뒤 편집본으로 고정한다.
  private void finalizeReorder(CustomRoadmap customRoadmap, List<CustomRoadmapNode> orderedNodes) {
    for (int i = 0; i < orderedNodes.size(); i += 1) {
      orderedNodes.get(i).changeCustomSortOrder(i + 1);
    }
    prerequisiteSyncService.relayoutAndRebuild(customRoadmap);
    customRoadmap.markPrerequisitesCustomized();
  }

  private CustomRoadmapNode getOwnedNode(Long userId, Long customRoadmapId, Long customNodeId) {
    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findById(customRoadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));

    if (!customRoadmap.getUser().getId().equals(userId)) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }

    CustomRoadmapNode customNode =
        customRoadmapNodeRepository
            .findById(customNodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_NODE_NOT_FOUND));

    if (!customNode.getCustomRoadmap().getId().equals(customRoadmap.getId())) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }

    return customNode;
  }
}

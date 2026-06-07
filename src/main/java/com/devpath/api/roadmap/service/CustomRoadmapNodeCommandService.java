package com.devpath.api.roadmap.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import java.util.ArrayList;
import java.util.List;
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

  /** 노드 삭제. 선행관계 간선을 함께 정리하고 진행률을 재계산한다. */
  @Transactional
  public void deleteNode(Long userId, Long customRoadmapId, Long customNodeId) {
    CustomRoadmapNode customNode = getOwnedNode(userId, customRoadmapId, customNodeId);
    CustomRoadmap customRoadmap = customNode.getCustomRoadmap();

    customNodePrerequisiteRepository.deleteAllByCustomNodeOrPrerequisiteCustomNode(customNode);
    customRoadmapNodeRepository.delete(customNode);

    long total = customRoadmapNodeRepository.countByCustomRoadmap(customRoadmap);
    long completed =
        customRoadmapNodeRepository.countByCustomRoadmapAndStatus(
            customRoadmap, NodeStatus.COMPLETED);
    roadmapProgressService.updateProgressRate(customRoadmap, total, completed);
  }

  /**
   * 노드를 한 칸 위/아래로 이동한다(customSortOrder 재배치). 이동 후 현재 순서 기준으로 선행관계 그래프를 재생성하고, 해당
   * 로드맵을 편집본으로 고정(공식 선행관계 자동 재적용 중단)한다. 진행상태는 보존된다.
   */
  @Transactional
  public void moveNode(Long userId, Long customRoadmapId, Long customNodeId, boolean up) {
    CustomRoadmapNode node = getOwnedNode(userId, customRoadmapId, customNodeId);
    CustomRoadmap customRoadmap = node.getCustomRoadmap();

    List<CustomRoadmapNode> ordered =
        new ArrayList<>(
            customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(
                customRoadmap));

    int index = -1;
    for (int i = 0; i < ordered.size(); i += 1) {
      if (ordered.get(i).getId().equals(node.getId())) {
        index = i;
        break;
      }
    }
    int neighborIndex = up ? index - 1 : index + 1;
    if (index < 0 || neighborIndex < 0 || neighborIndex >= ordered.size()) {
      return; // 경계(맨 위/아래) — 변경 없음
    }

    // 리스트에서 한 칸 이동 후 재번호+선행관계 재생성+편집본 고정
    ordered.remove(index);
    ordered.add(neighborIndex, node);
    finalizeReorder(customRoadmap, ordered);
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

    backfillBranchGroupsIfNeeded(customRoadmap);
    node.setBranchGroupOverride(branchGroup);

    prerequisiteSyncService.rebuildFromCurrentOrder(customRoadmap);
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
    prerequisiteSyncService.rebuildFromCurrentOrder(customRoadmap);
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

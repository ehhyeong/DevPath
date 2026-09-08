package com.devpath.api.recommendation.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.roadmap.entity.BranchKind;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.CustomRoadmapNodeCommandService;
import com.devpath.domain.roadmap.service.CustomRoadmapPrerequisiteSyncService;
import com.devpath.domain.roadmap.service.RoadmapProgressService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class RecommendationChangeRoadmapEditor {

  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final RoadmapProgressService roadmapProgressService;
  private final CustomRoadmapNodeCommandService customRoadmapNodeCommandService;
  private final CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;

  void apply(RecommendationChange change, Long userId) {
    if (change.getTargetCustomRoadmapId() != null) {
      addBranchNodeByExplicitTarget(change);
    } else if (change.getNodeChangeType() == NodeChangeType.ADD) {
      addNodeToCustomRoadmap(change.getRoadmapNode(), userId, change.getBranchFromNodeId());
    } else if (change.getNodeChangeType() == NodeChangeType.DELETE) {
      deleteNodeFromCustomRoadmaps(change.getRoadmapNode().getNodeId(), userId);
    } else if (change.getNodeChangeType() == NodeChangeType.REORDER) {
      reorderNodeInCustomRoadmap(change, userId);
    }
  }

  private void addNodeToCustomRoadmap(RoadmapNode roadmapNode, Long userId, Long branchFromNodeId) {
    Long roadmapId;
    if (branchFromNodeId != null) {
      RoadmapNode branchFromNode =
          roadmapNodeRepository
              .findById(branchFromNodeId)
              .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));
      roadmapId = branchFromNode.getRoadmap().getRoadmapId();
    } else {
      roadmapId = roadmapNode.getRoadmap().getRoadmapId();
    }

    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
    if (customRoadmapNodeRepository
        .findByCustomRoadmapAndOriginalNode(customRoadmap, roadmapNode)
        .isPresent()) {
      return;
    }

    int insertAt;
    if (branchFromNodeId != null) {
      insertAt =
          customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap).stream()
              .filter(n -> n.getOriginalNode().getNodeId().equals(branchFromNodeId))
              .mapToInt(
                  n ->
                      n.getCustomSortOrder() != null
                          ? n.getCustomSortOrder() + 1
                          : Integer.MAX_VALUE)
              .findFirst()
              .orElse(
                  roadmapNode.getSortOrder() != null
                      ? roadmapNode.getSortOrder() + 1
                      : Integer.MAX_VALUE);
    } else {
      insertAt =
          roadmapNode.getSortOrder() != null ? roadmapNode.getSortOrder() + 1 : Integer.MAX_VALUE;
    }

    customRoadmapNodeRepository
        .findAllByCustomRoadmapAndCustomSortOrderGreaterThanEqual(customRoadmap, insertAt)
        .forEach(node -> node.shiftSortOrder(1));
    customRoadmapNodeRepository.save(
        CustomRoadmapNode.builder()
            .customRoadmap(customRoadmap)
            .originalNode(roadmapNode)
            .customSortOrder(insertAt)
            .build());
    // 새로 붙인 노드까지 포함해 레인을 다시 도출한 뒤 선행관계를 재생성한다.
    prerequisiteSyncService.relayoutAndRebuild(customRoadmap);
    roadmapProgressService.updateProgressRate(
        customRoadmap, customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap));
  }

  private void addBranchNodeByExplicitTarget(RecommendationChange change) {
    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findById(change.getTargetCustomRoadmapId())
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
    if (!customRoadmap.getUser().getId().equals(change.getUser().getId())) {
      throw new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND);
    }
    if (customRoadmapNodeRepository
        .findByCustomRoadmapAndOriginalNode(customRoadmap, change.getRoadmapNode())
        .isPresent()) {
      return;
    }

    List<CustomRoadmapNode> allNodes =
        customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap);
    CustomRoadmapNode anchor =
        change.getAnchorCustomNodeId() == null
            ? null
            : allNodes.stream()
                .filter(node -> node.getId().equals(change.getAnchorCustomNodeId()))
                .findFirst()
                .orElse(null);
    if (anchor == null) {
      // 앵커 없는 곁가지는 레인 그래프에도 화면 트리에도 걸리지 않아 사라진다. 척추 말미 일반 노드로 붙인다.
      appendAsSpineNode(customRoadmap, change.getRoadmapNode(), allNodes);
      return;
    }

    // 추천 분기는 기준 노드에 곁가지로 매단다. 복습/심화 구분은 제안이 지정한 분기 종류를 따른다.
    BranchKind kind =
        "ADVANCED".equalsIgnoreCase(change.getBranchType())
            ? BranchKind.ADVANCED
            : BranchKind.REVIEW;
    CustomRoadmapNode newNode =
        customRoadmapNodeRepository.save(
            CustomRoadmapNode.builder()
                .customRoadmap(customRoadmap)
                .originalNode(change.getRoadmapNode())
                .build());
    newNode.assignLane(kind, anchor.getId(), nextLaneKeyAt(allNodes, anchor.getId()), 0);

    // 표시 순서(customSortOrder)는 레인 트리에서 파생시키고 선행관계도 함께 재생성한다.
    prerequisiteSyncService.recomputeOrderAndRebuild(customRoadmap);
    roadmapProgressService.updateProgressRate(
        customRoadmap, customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap));
  }

  // 곁가지로 매달 앵커가 없을 때의 폴백. 레인 없이 저장하면 relayout이 척추(SPINE)로 편입한다.
  private void appendAsSpineNode(
      CustomRoadmap customRoadmap, RoadmapNode roadmapNode, List<CustomRoadmapNode> allNodes) {
    int insertAt =
        allNodes.stream()
                .map(CustomRoadmapNode::getCustomSortOrder)
                .filter(java.util.Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0)
            + 1;
    customRoadmapNodeRepository.save(
        CustomRoadmapNode.builder()
            .customRoadmap(customRoadmap)
            .originalNode(roadmapNode)
            .customSortOrder(insertAt)
            .build());
    prerequisiteSyncService.relayoutAndRebuild(customRoadmap);
    roadmapProgressService.updateProgressRate(
        customRoadmap, customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap));
  }

  // 같은 앵커에 매달린 형제 레인과 겹치지 않는 새 laneKey(기존 최대+1, 없으면 1)를 반환한다.
  private int nextLaneKeyAt(List<CustomRoadmapNode> nodes, Long anchorNodeId) {
    return nodes.stream()
            .filter(n -> java.util.Objects.equals(n.getAnchorNodeId(), anchorNodeId))
            .map(CustomRoadmapNode::getLaneKey)
            .filter(java.util.Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0)
        + 1;
  }

  private void deleteNodeFromCustomRoadmaps(Long originalNodeId, Long userId) {
    List<CustomRoadmapNode> targets =
        customRoadmapNodeRepository.findAllByOriginalNodeIdAndUserId(originalNodeId, userId);
    for (CustomRoadmapNode node : targets) {
      CustomRoadmap roadmap = node.getCustomRoadmap();
      List<CustomRoadmapNode> remainingNodes =
          customRoadmapNodeRepository.findAllByCustomRoadmap(roadmap).stream()
              .filter(candidate -> !candidate.getId().equals(node.getId()))
              .toList();
      customNodePrerequisiteRepository.deleteAllByCustomNodeOrPrerequisiteCustomNode(node);
      customRoadmapNodeRepository.delete(node);
      roadmapProgressService.updateProgressRate(roadmap, remainingNodes);
    }
  }

  private void reorderNodeInCustomRoadmap(RecommendationChange change, Long userId) {
    RoadmapNode movedOriginal = change.getRoadmapNode();
    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findByUserIdAndOriginalRoadmapRoadmapId(
                userId, movedOriginal.getRoadmap().getRoadmapId())
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
    CustomRoadmapNode moved =
        customRoadmapNodeRepository
            .findByCustomRoadmapAndOriginalNode(customRoadmap, movedOriginal)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_NODE_NOT_FOUND));

    CustomRoadmapNode anchor = null;
    if (change.getReorderAfterNodeId() != null) {
      RoadmapNode anchorOriginal =
          roadmapNodeRepository.findById(change.getReorderAfterNodeId()).orElse(null);
      if (anchorOriginal != null) {
        anchor =
            customRoadmapNodeRepository
                .findByCustomRoadmapAndOriginalNode(customRoadmap, anchorOriginal)
                .orElse(null);
      }
    }
    customRoadmapNodeCommandService.reorderAfter(customRoadmap, moved, anchor);
  }
}

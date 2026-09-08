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
    if (change.getNodeChangeType() == NodeChangeType.DELETE) {
      deleteNodeFromCustomRoadmaps(change.getRoadmapNode().getNodeId(), userId);
      return;
    }
    if (change.getNodeChangeType() == NodeChangeType.REORDER) {
      reorderNodeInCustomRoadmap(change, userId);
      return;
    }
    if (change.getNodeChangeType() != NodeChangeType.ADD) {
      return;
    }
    // 분기 종류를 지정한 제안만 곁가지로 매단다. 그 밖의 신규 노드 제안은 척추에 삽입한다.
    if (change.getTargetCustomRoadmapId() != null && change.getBranchType() != null) {
      addBranchNodeByExplicitTarget(change);
      return;
    }
    addNodeToCustomRoadmap(change, userId);
  }

  private void addNodeToCustomRoadmap(RecommendationChange change, Long userId) {
    RoadmapNode roadmapNode = change.getRoadmapNode();
    Long branchFromNodeId = change.getBranchFromNodeId();
    CustomRoadmap customRoadmap =
        change.getTargetCustomRoadmapId() != null
            ? findOwnedRoadmap(change.getTargetCustomRoadmapId(), userId)
            : findCopiedRoadmap(roadmapNode, branchFromNodeId, userId);
    if (customRoadmapNodeRepository
        .findByCustomRoadmapAndOriginalNode(customRoadmap, roadmapNode)
        .isPresent()) {
      return;
    }

    List<CustomRoadmapNode> allNodes =
        customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap);
    Integer anchorOrder =
        anchorSortOrder(allNodes, change.getAnchorCustomNodeId(), branchFromNodeId);
    int insertAt;
    if (anchorOrder != null) {
      insertAt = anchorOrder + 1;
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

  // 삽입 기준 노드의 표시 순서. 제안이 지목한 앵커 커스텀 노드를 우선하고, 없으면 출발 원본 노드로 찾는다.
  // 빌더 모듈 노드는 originalNode가 없으므로 후자 탐색에서 걸러낸다.
  private Integer anchorSortOrder(
      List<CustomRoadmapNode> allNodes, Long anchorCustomNodeId, Long branchFromNodeId) {
    if (anchorCustomNodeId != null) {
      Integer order =
          allNodes.stream()
              .filter(node -> anchorCustomNodeId.equals(node.getId()))
              .map(CustomRoadmapNode::getCustomSortOrder)
              .filter(java.util.Objects::nonNull)
              .findFirst()
              .orElse(null);
      if (order != null) {
        return order;
      }
    }
    if (branchFromNodeId == null) {
      return null;
    }
    return allNodes.stream()
        .filter(node -> node.getOriginalNode() != null)
        .filter(node -> branchFromNodeId.equals(node.getOriginalNode().getNodeId()))
        .map(CustomRoadmapNode::getCustomSortOrder)
        .filter(java.util.Objects::nonNull)
        .findFirst()
        .orElse(null);
  }

  // 제안이 타깃 로드맵을 지정한 경우(빌더 기원 포함). 소유자 검증 후 그대로 사용한다.
  private CustomRoadmap findOwnedRoadmap(Long customRoadmapId, Long userId) {
    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findById(customRoadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
    if (!customRoadmap.getUser().getId().equals(userId)) {
      throw new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND);
    }
    return customRoadmap;
  }

  // 타깃 지정이 없는 경로. 출발 노드가 속한 공식 로드맵의 학습자 복사본을 찾는다.
  private CustomRoadmap findCopiedRoadmap(
      RoadmapNode roadmapNode, Long branchFromNodeId, Long userId) {
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
    return customRoadmapRepository
        .findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId)
        .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
  }

  private void addBranchNodeByExplicitTarget(RecommendationChange change) {
    CustomRoadmap customRoadmap =
        findOwnedRoadmap(change.getTargetCustomRoadmapId(), change.getUser().getId());
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

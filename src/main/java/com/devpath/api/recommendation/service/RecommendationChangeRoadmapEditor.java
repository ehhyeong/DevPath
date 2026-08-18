package com.devpath.api.recommendation.service;

import com.devpath.api.roadmap.service.CustomRoadmapNodeCommandService;
import com.devpath.api.roadmap.service.RoadmapProgressService;
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
            .isBranch(branchFromNodeId != null)
            .branchFromNodeId(branchFromNodeId)
            .build());
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
    int insertAt =
        anchor != null && anchor.getCustomSortOrder() != null
            ? anchor.getCustomSortOrder() + 1
            : allNodes.stream()
                    .map(CustomRoadmapNode::getCustomSortOrder)
                    .filter(java.util.Objects::nonNull)
                    .max(Integer::compareTo)
                    .orElse(0)
                + 1;
    customRoadmapNodeRepository
        .findAllByCustomRoadmapAndCustomSortOrderGreaterThanEqual(customRoadmap, insertAt)
        .forEach(node -> node.shiftSortOrder(1));
    Long branchFromNodeId =
        anchor != null && anchor.getOriginalNode() != null
            ? anchor.getOriginalNode().getNodeId()
            : null;
    CustomRoadmapNode newNode =
        customRoadmapNodeRepository.save(
            CustomRoadmapNode.builder()
                .customRoadmap(customRoadmap)
                .originalNode(change.getRoadmapNode())
                .customSortOrder(insertAt)
                .isBranch(true)
                .branchFromNodeId(branchFromNodeId)
                .branchType(change.getBranchType())
                .build());

    // 타깃이 이미 레인 모델이면(빌더 기원 등) 새 분기 노드도 레인 필드를 세팅한다(TASK-56 P5).
    // 레거시 로드맵에 섞으면 판별이 뒤집혀 기존 노드가 평탄화되므로 조건부로만 적용한다.
    boolean targetIsLane = allNodes.stream().anyMatch(n -> n.getBranchKind() != null);
    if (targetIsLane) {
      BranchKind kind =
          "ADVANCED".equalsIgnoreCase(change.getBranchType())
              ? BranchKind.ADVANCED
              : BranchKind.REVIEW;
      Long anchorNodeId = anchor != null ? anchor.getId() : null;
      newNode.assignLane(kind, anchorNodeId, nextLaneKeyAt(allNodes, anchorNodeId), 0);
    }

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

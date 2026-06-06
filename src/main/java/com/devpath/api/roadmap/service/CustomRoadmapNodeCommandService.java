package com.devpath.api.roadmap.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 학습자가 커스텀 로드맵 노드를 직접 보류(defer)하거나 삭제하는 명령 서비스. */
@Service
@RequiredArgsConstructor
public class CustomRoadmapNodeCommandService {

  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  private final RoadmapProgressService roadmapProgressService;

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

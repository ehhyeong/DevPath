package com.devpath.api.roadmap.service;

import com.devpath.api.roadmap.dto.NodeClearResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NodeClearanceCommandService {

  private final UserRepository userRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final NodeClearanceRepository nodeClearanceRepository;
  private final RoadmapProgressService roadmapProgressService;
  private final CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;

  @Transactional
  public NodeClearResponse clearNode(Long userId, Long customRoadmapId, Long customNodeId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findById(customRoadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));

    if (!customRoadmap.getUser().getId().equals(userId)) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }

    prerequisiteSyncService.ensurePrerequisites(customRoadmap);

    CustomRoadmapNode customNode =
        customRoadmapNodeRepository
            .findById(customNodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_NODE_NOT_FOUND));

    if (!customNode.getCustomRoadmap().getId().equals(customRoadmap.getId())) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }

    if (customNode.getStatus() == NodeStatus.COMPLETED) {
      throw new CustomException(ErrorCode.NODE_ALREADY_COMPLETED);
    }

    // 선행 노드가 모두 완료되었는지 확인한다.
    if (customNodePrerequisiteRepository.countByCustomNodeAndPrerequisiteNotCompleted(
            customNode, NodeStatus.COMPLETED)
        > 0) {
      throw new CustomException(ErrorCode.NODE_LOCKED);
    }

    // 필수 태그 확인 (템플릿 기반 노드만)
    if (customNode.getOriginalNode() != null) {
      Long originalNodeId = customNode.getOriginalNode().getNodeId();
      List<String> requiredTags = nodeRequiredTagRepository.findTagNamesByNodeId(originalNodeId);
      if (!requiredTags.isEmpty()) {
        List<String> userTags = userTechStackRepository.findTagNamesByUserId(userId);
        if (!userTags.containsAll(requiredTags)) {
          throw new CustomException(ErrorCode.INSUFFICIENT_TAGS);
        }
      }
    }

    // 노드를 완료 처리한다.
    customNode.completeLearning();

    // NodeClearance 레코드 생성 (템플릿 기반 노드만)
    if (customNode.getOriginalNode() != null) {
      Long originalNodeId = customNode.getOriginalNode().getNodeId();
      NodeClearance clearance =
          nodeClearanceRepository
              .findByUserIdAndNodeNodeId(userId, originalNodeId)
              .orElseGet(
                  () ->
                      NodeClearance.builder()
                          .user(user)
                          .node(customNode.getOriginalNode())
                          .build());
      clearance.recalculate(
          ClearanceStatus.CLEARED, BigDecimal.ONE, true, 0, true, true, true, true);
      nodeClearanceRepository.save(clearance);
    }

    // 진행률을 재계산한다.
    long total = customRoadmapNodeRepository.countByCustomRoadmap(customRoadmap);
    long completed =
        customRoadmapNodeRepository.countByCustomRoadmapAndStatus(
            customRoadmap, NodeStatus.COMPLETED);
    roadmapProgressService.updateProgressRate(customRoadmap, total, completed);

    return NodeClearResponse.of(customNode);
  }
}

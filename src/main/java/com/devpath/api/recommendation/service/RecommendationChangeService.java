package com.devpath.api.recommendation.service;

import com.devpath.api.learning.service.SupplementRecommendationService;
import com.devpath.api.learning.service.TilService;
import com.devpath.api.learning.service.WeaknessAnalysisService;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.recommendation.dto.RecommendationChangeRequest;
import com.devpath.api.recommendation.dto.RecommendationChangeResponse;
import com.devpath.api.roadmap.service.RoadmapProgressService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.automation.AutomationRuleStatus;
import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.automation.LearningAutomationRuleRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RecommendationChangeService {

  private final RecommendationChangeRepository recommendationChangeRepository;
  private final RecommendationHistoryRepository recommendationHistoryRepository;
  private final UserRepository userRepository;
  private final RoadmapRepository roadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final LearningAutomationRuleRepository learningAutomationRuleRepository;
  private final SupplementRecommendationService supplementRecommendationService;
  private final RecommendationHistoryService recommendationHistoryService;
  private final RiskWarningService riskWarningService;
  private final WeaknessAnalysisService weaknessAnalysisService;
  private final TilService tilService;
  private final RoadmapProgressService roadmapProgressService;
  private final TagRepository tagRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final NotificationEventService notificationEventService;

  @Transactional
  public List<RecommendationChangeResponse.Detail> createSuggestions(
      Long userId, RecommendationChangeRequest.Suggestion request) {
    List<RecommendationChangeResponse.Detail> suggestions =
        createSuggestionsInternal(userId, request);

    if (!suggestions.isEmpty()) {
      notificationEventService.notifyRecommendationArrived(userId, suggestions.size());
    }

    return suggestions;
  }

  // 추천 생성 핵심 로직. 외부 직접 호출(createSuggestions)과
  // 내부 재계산(recalculateNextNodes) 양쪽에서 사용하며,
  // 알림 발송은 오직 createSuggestions()에서만 담당한다.
  private List<RecommendationChangeResponse.Detail> createSuggestionsInternal(
      Long userId, RecommendationChangeRequest.Suggestion request) {
    if (!isRuleEnabled("RECOMMENDATION_CHANGE_ENABLED", true)) {
      throw new CustomException(ErrorCode.LEARNING_RULE_DISABLED);
    }

    User user = validateUser(userId);

    if (request.getRoadmapId() != null) {
      roadmapRepository
          .findById(request.getRoadmapId())
          .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
    }

    int limit = resolveSuggestionLimit(request.getLimit());
    long tilSignalCount = tilService.getTilSignalCountForRecommendationChange(userId);
    boolean weaknessSignal =
        weaknessAnalysisService.hasLatestAnalysisSignalForRecommendationChange(userId);
    long riskWarningCount =
        riskWarningService.getUnacknowledgedWarningCountForRecommendationChange(userId);
    long recommendationHistoryCount =
        recommendationHistoryService.getRecentHistoryCountForRecommendationChange(userId);

    List<SupplementRecommendation> supplementRecommendations =
        supplementRecommendationService.getPendingRecommendationsForRecommendationChange(
            userId, request.getRoadmapId());

    return supplementRecommendations.stream()
        .limit(limit)
        .map(
            supplementRecommendation ->
                upsertChange(
                    user,
                    supplementRecommendation,
                    buildReason(supplementRecommendation),
                    buildContextSummary(
                        tilSignalCount,
                        weaknessSignal,
                        riskWarningCount,
                        recommendationHistoryCount)))
        .map(this::toDetail)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<RecommendationChangeResponse.Detail> getRecommendationChanges(
      Long userId, Long roadmapId) {
    validateUser(userId);

    List<RecommendationChange> changes =
        roadmapId == null
            ? recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
                userId, RecommendationChangeStatus.SUGGESTED)
            : recommendationChangeRepository
                .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
                    userId, roadmapId, RecommendationChangeStatus.SUGGESTED);

    return changes
        .stream()
        .map(this::toDetail)
        .toList();
  }

  @Transactional
  public RecommendationChangeResponse.Detail apply(Long userId, Long changeId) {
    RecommendationChange recommendationChange =
        recommendationChangeRepository
            .findByIdAndUserId(changeId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_CHANGE_NOT_FOUND));

    if (recommendationChange.getChangeStatus() != RecommendationChangeStatus.SUGGESTED) {
      throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
    }

    recommendationChange.apply();

    if (recommendationChange.getNodeChangeType() == NodeChangeType.ADD) {
      addNodeToCustomRoadmap(
          recommendationChange.getRoadmapNode(),
          userId,
          recommendationChange.getBranchFromNodeId());
      registerRequiredTagsForNode(recommendationChange.getRoadmapNode());
    } else if (recommendationChange.getNodeChangeType() == NodeChangeType.DELETE) {
      deleteNodeFromCustomRoadmaps(recommendationChange.getRoadmapNode().getNodeId(), userId);
    }

    if (recommendationChange.getSourceRecommendationId() != null) {
      supplementRecommendationService.approveRecommendation(
          userId, recommendationChange.getSourceRecommendationId());
    }

    saveHistory(
        recommendationChange,
        "CHANGE_APPLY",
        RecommendationChangeStatus.SUGGESTED.name(),
        RecommendationChangeStatus.APPLIED.name());

    return toDetail(recommendationChange);
  }

  @Transactional
  public RecommendationChangeResponse.Detail ignore(Long userId, Long changeId) {
    RecommendationChange recommendationChange =
        recommendationChangeRepository
            .findByIdAndUserId(changeId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_CHANGE_NOT_FOUND));

    if (recommendationChange.getChangeStatus() != RecommendationChangeStatus.SUGGESTED) {
      throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
    }

    recommendationChange.ignore();

    if (recommendationChange.getSourceRecommendationId() != null) {
      supplementRecommendationService.rejectRecommendation(
          userId, recommendationChange.getSourceRecommendationId());
    }

    saveHistory(
        recommendationChange,
        "CHANGE_IGNORE",
        RecommendationChangeStatus.SUGGESTED.name(),
        RecommendationChangeStatus.IGNORED.name());

    return toDetail(recommendationChange);
  }

  @Transactional(readOnly = true)
  public List<RecommendationChangeResponse.HistoryItem> getHistories(Long userId, Long roadmapId) {
    validateUser(userId);

    Set<RecommendationChangeStatus> processedStatuses =
        Set.of(
            RecommendationChangeStatus.APPLIED,
            RecommendationChangeStatus.IGNORED,
            RecommendationChangeStatus.RECALCULATED);

    List<RecommendationChange> histories =
        roadmapId == null
            ? recommendationChangeRepository.findAllByUserIdAndChangeStatusInOrderByUpdatedAtDesc(
                userId, processedStatuses)
            : recommendationChangeRepository
                .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusInOrderByUpdatedAtDesc(
                    userId, roadmapId, processedStatuses);

    return histories
        .stream()
        .map(
            recommendationChange ->
                RecommendationChangeResponse.HistoryItem.builder()
                    .changeId(recommendationChange.getId())
                    .nodeId(recommendationChange.getRoadmapNode().getNodeId())
                    .nodeTitle(recommendationChange.getRoadmapNode().getTitle())
                    .changeStatus(recommendationChange.getChangeStatus().name())
                    .nodeChangeType(recommendationChange.getNodeChangeType().name())
                    .decisionStatus(recommendationChange.getDecisionStatus().name())
                    .updatedAt(recommendationChange.getUpdatedAt())
                    .build())
        .toList();
  }

  @Transactional
  public RecommendationChangeResponse.RecalculateResult recalculateNextNodes(
      Long userId, RecommendationChangeRequest.RecalculateNextNodes request) {
    validateUser(userId);

    List<RecommendationChange> currentPendingChanges =
        request.getRoadmapId() == null
            ? recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
                userId, RecommendationChangeStatus.SUGGESTED)
            : recommendationChangeRepository
                .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
                    userId, request.getRoadmapId(), RecommendationChangeStatus.SUGGESTED);

    for (RecommendationChange currentPendingChange : currentPendingChanges) {
      currentPendingChange.markRecalculated();
    }

    List<RecommendationChangeResponse.Detail> regenerated =
        createSuggestionsInternal(userId, RecommendationChangeRequest.SuggestionHolder.from(request));

    return RecommendationChangeResponse.RecalculateResult.builder()
        .recalculatedCount(currentPendingChanges.size())
        .items(regenerated)
        .build();
  }

  private RecommendationChange upsertChange(
      User user,
      SupplementRecommendation supplementRecommendation,
      String reason,
      String contextSummary) {
    return recommendationChangeRepository
        .findTopByUserIdAndRoadmapNodeNodeIdAndChangeStatusOrderByCreatedAtDesc(
            user.getId(),
            supplementRecommendation.getRoadmapNode().getNodeId(),
            RecommendationChangeStatus.SUGGESTED)
        .orElseGet(
            () ->
                recommendationChangeRepository.save(
                    RecommendationChange.builder()
                        .user(user)
                        .roadmapNode(supplementRecommendation.getRoadmapNode())
                        .sourceRecommendationId(supplementRecommendation.getId())
                        .reason(reason)
                        .contextSummary(contextSummary)
                        .nodeChangeType(NodeChangeType.ADD)
                        .build()));
  }

  private String buildReason(SupplementRecommendation supplementRecommendation) {
    if (supplementRecommendation.getReason() != null
        && !supplementRecommendation.getReason().isBlank()) {
      return supplementRecommendation.getReason();
    }

    return "Generated a recommendation change from the existing supplement recommendation flow.";
  }

  private String buildContextSummary(
      long tilSignalCount,
      boolean weaknessSignal,
      long riskWarningCount,
      long recommendationHistoryCount) {
    return "tilCount="
        + tilSignalCount
        + ", weaknessSignal="
        + weaknessSignal
        + ", warningCount="
        + riskWarningCount
        + ", historyCount="
        + recommendationHistoryCount;
  }

  private void saveHistory(
      RecommendationChange recommendationChange,
      String actionType,
      String beforeStatus,
      String afterStatus) {
    recommendationHistoryRepository.save(
        RecommendationHistory.builder()
            .user(recommendationChange.getUser())
            .recommendationId(recommendationChange.getId())
            .roadmapNode(recommendationChange.getRoadmapNode())
            .beforeStatus(beforeStatus)
            .afterStatus(afterStatus)
            .actionType(actionType)
            .context(recommendationChange.getContextSummary())
            .build());
  }

  // 룰 활성 여부를 조회한다.
  private boolean isRuleEnabled(String ruleKey, boolean defaultValue) {
    return learningAutomationRuleRepository
        .findTopByRuleKeyOrderByPriorityDescIdDesc(ruleKey)
        .map(rule -> AutomationRuleStatus.ENABLED.equals(rule.getStatus()))
        .orElse(defaultValue);
  }

  // 추천 변경 제안 최대 개수를 계산한다.
  private int resolveSuggestionLimit(Integer requestLimit) {
    int requestedLimit = requestLimit == null || requestLimit <= 0 ? 5 : requestLimit;

    return learningAutomationRuleRepository
        .findTopByRuleKeyOrderByPriorityDescIdDesc("RECOMMENDATION_CHANGE_MAX_LIMIT")
        .map(rule -> parsePositiveInt(rule.getRuleValue(), requestedLimit))
        .map(configuredLimit -> Math.min(requestedLimit, configuredLimit))
        .orElse(requestedLimit);
  }

  // ADD 타입 변경 적용: 해당 유저의 커스텀 로드맵에 노드 추가 + 진행률 재계산
  private void addNodeToCustomRoadmap(RoadmapNode roadmapNode, Long userId, Long branchFromNodeId) {
    Long roadmapId = roadmapNode.getRoadmap().getRoadmapId();

    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));

    // 이미 커스텀 로드맵에 존재하면 중복 추가 방지
    boolean alreadyExists =
        customRoadmapNodeRepository
            .findByCustomRoadmapAndOriginalNode(customRoadmap, roadmapNode)
            .isPresent();

    if (alreadyExists) {
      return;
    }

    // 삽입 위치: branchFromNodeId(클리어한 노드)의 customSortOrder 바로 다음
    // branchFromNodeId가 없으면 roadmapNode.sortOrder 기준으로 fallback
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

    List<CustomRoadmapNode> nodesToShift =
        customRoadmapNodeRepository.findAllByCustomRoadmapAndCustomSortOrderGreaterThanEqual(
            customRoadmap, insertAt);
    nodesToShift.forEach(n -> n.shiftSortOrder(1));

    customRoadmapNodeRepository.save(
        CustomRoadmapNode.builder()
            .customRoadmap(customRoadmap)
            .originalNode(roadmapNode)
            .customSortOrder(insertAt)
            .isBranch(branchFromNodeId != null)
            .branchFromNodeId(branchFromNodeId)
            .build());

    // 진행률 재계산 (새 노드는 NOT_STARTED이므로 분모만 늘어남)
    List<CustomRoadmapNode> allNodes =
        customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap);
    roadmapProgressService.updateProgressRate(customRoadmap, allNodes);
  }

  // 추천 노드 수락 시 subTopics 기반 태그를 node_required_tags에 등록
  private void registerRequiredTagsForNode(RoadmapNode node) {
    if (node.getSubTopics() == null || node.getSubTopics().isBlank()) return;

    List<String> tagNames =
        Arrays.stream(node.getSubTopics().split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();

    for (String tagName : tagNames) {
      tagRepository
          .findByName(tagName)
          .ifPresent(
              tag -> {
                if (!nodeRequiredTagRepository.existsByNodeNodeIdAndTagTagId(
                    node.getNodeId(), tag.getTagId())) {
                  nodeRequiredTagRepository.save(
                      NodeRequiredTag.builder().node(node).tag(tag).build());
                }
              });
    }
  }

  // DELETE 타입 변경 적용: 해당 유저의 커스텀 로드맵에서 노드 삭제 + prerequisites 정리 + 진행률 재계산
  private void deleteNodeFromCustomRoadmaps(Long originalNodeId, Long userId) {
    List<CustomRoadmapNode> targets =
        customRoadmapNodeRepository.findAllByOriginalNodeIdAndUserId(originalNodeId, userId);

    for (CustomRoadmapNode node : targets) {
      CustomRoadmap roadmap = node.getCustomRoadmap();

      // 삭제 전 남은 노드 기준으로 진행률 미리 계산
      List<CustomRoadmapNode> allNodes =
          customRoadmapNodeRepository.findAllByCustomRoadmap(roadmap);
      List<CustomRoadmapNode> remainingNodes =
          allNodes.stream().filter(n -> !n.getId().equals(node.getId())).toList();

      // prerequisites 양방향 정리
      customNodePrerequisiteRepository.deleteAllByCustomNodeOrPrerequisiteCustomNode(node);

      // 노드 삭제
      customRoadmapNodeRepository.delete(node);

      // 진행률 업데이트
      roadmapProgressService.updateProgressRate(roadmap, remainingNodes);
    }
  }

  // 양의 정수 문자열을 파싱한다.
  private int parsePositiveInt(String value, int defaultValue) {
    try {
      int parsed = Integer.parseInt(value);
      return parsed > 0 ? parsed : defaultValue;
    } catch (NumberFormatException exception) {
      return defaultValue;
    }
  }

  private User validateUser(Long userId) {
    if (userId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private RecommendationChangeResponse.Detail toDetail(RecommendationChange recommendationChange) {
    return RecommendationChangeResponse.Detail.builder()
        .changeId(recommendationChange.getId())
        .sourceRecommendationId(recommendationChange.getSourceRecommendationId())
        .nodeId(recommendationChange.getRoadmapNode().getNodeId())
        .nodeTitle(recommendationChange.getRoadmapNode().getTitle())
        .nodeSortOrder(recommendationChange.getRoadmapNode().getSortOrder())
        .branchFromNodeId(recommendationChange.getBranchFromNodeId())
        .reason(recommendationChange.getReason())
        .contextSummary(recommendationChange.getContextSummary())
        .nodeChangeType(recommendationChange.getNodeChangeType().name())
        .changeStatus(recommendationChange.getChangeStatus().name())
        .decisionStatus(recommendationChange.getDecisionStatus().name())
        .suggestedAt(recommendationChange.getSuggestedAt())
        .appliedAt(recommendationChange.getAppliedAt())
        .ignoredAt(recommendationChange.getIgnoredAt())
        .build();
  }
}

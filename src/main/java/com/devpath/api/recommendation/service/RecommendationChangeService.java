package com.devpath.api.recommendation.service;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.recommendation.dto.RecommendationChangeRequest;
import com.devpath.api.recommendation.dto.RecommendationChangeResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import com.devpath.domain.learning.service.LearningAutomationRuleCatalog;
import com.devpath.domain.learning.service.RecommendationChangeSignalReader;
import com.devpath.domain.learning.service.SupplementRecommendationLifecycleService;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.roadmap.service.NodeRequiredTagRegistrar;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
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
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final LearningAutomationPolicyService learningAutomationPolicyService;
  private final RecommendationChangeSignalReader signalReader;
  private final SupplementRecommendationLifecycleService supplementRecommendationLifecycleService;
  private final RecommendationHistoryService recommendationHistoryService;
  private final RiskWarningService riskWarningService;
  private final NodeRequiredTagRegistrar nodeRequiredTagRegistrar;
  private final NotificationEventService notificationEventService;
  private final RecommendationChangeRoadmapEditor roadmapEditor;

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
    if (!learningAutomationPolicyService.isEnabled(
        LearningAutomationRuleCatalog.RECOMMENDATION_CHANGE_ENABLED, true)) {
      throw new CustomException(ErrorCode.LEARNING_RULE_DISABLED);
    }

    User user = validateUser(userId);

    if (request.getRoadmapId() != null) {
      roadmapRepository
          .findById(request.getRoadmapId())
          .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
    }

    int limit = resolveSuggestionLimit(request.getLimit());
    RecommendationChangeSignalReader.Signals signals =
        signalReader.read(userId, request.getRoadmapId());
    long riskWarningCount =
        riskWarningService.getUnacknowledgedWarningCountForRecommendationChange(userId);
    long recommendationHistoryCount =
        recommendationHistoryService.getRecentHistoryCountForRecommendationChange(userId);

    return signals.pendingRecommendations().stream()
        .limit(limit)
        .map(
            supplementRecommendation ->
                upsertChange(
                    user,
                    supplementRecommendation,
                    buildReason(supplementRecommendation),
                    buildContextSummary(
                        signals.tilCount(),
                        signals.hasWeaknessAnalysis(),
                        riskWarningCount,
                        recommendationHistoryCount)))
        .map(this::toDetail)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<RecommendationChangeResponse.Detail> getRecommendationChanges(
      Long userId, Long roadmapId, Long customRoadmapId) {
    validateUser(userId);

    List<RecommendationChange> changes =
        customRoadmapId != null
            ? recommendationChangeRepository
                .findAllByUserIdAndTargetCustomRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
                    userId, customRoadmapId, RecommendationChangeStatus.SUGGESTED)
            : roadmapId == null
                ? recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
                    userId, RecommendationChangeStatus.SUGGESTED)
                : recommendationChangeRepository
                    .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
                        userId, roadmapId, RecommendationChangeStatus.SUGGESTED);

    return changes.stream().map(this::toDetail).toList();
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

    roadmapEditor.apply(recommendationChange, userId);
    if (recommendationChange.getTargetCustomRoadmapId() != null
        || recommendationChange.getNodeChangeType() == NodeChangeType.ADD) {
      nodeRequiredTagRegistrar.registerFromSubTopics(recommendationChange.getRoadmapNode());
    }

    if (recommendationChange.getSourceRecommendationId() != null) {
      supplementRecommendationLifecycleService.approve(
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
      supplementRecommendationLifecycleService.reject(
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
  public List<RecommendationChangeResponse.HistoryItem> getHistories(
      Long userId, Long roadmapId, Long customRoadmapId) {
    validateUser(userId);

    Set<RecommendationChangeStatus> processedStatuses =
        Set.of(
            RecommendationChangeStatus.APPLIED,
            RecommendationChangeStatus.IGNORED,
            RecommendationChangeStatus.RECALCULATED);

    List<RecommendationChange> histories =
        customRoadmapId != null
            ? recommendationChangeRepository
                .findAllByUserIdAndTargetCustomRoadmapIdAndChangeStatusInOrderByUpdatedAtDesc(
                    userId, customRoadmapId, processedStatuses)
            : roadmapId == null
                ? recommendationChangeRepository
                    .findAllByUserIdAndChangeStatusInOrderByUpdatedAtDesc(userId, processedStatuses)
                : recommendationChangeRepository
                    .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusInOrderByUpdatedAtDesc(
                        userId, roadmapId, processedStatuses);

    return histories.stream()
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
        createSuggestionsInternal(
            userId, RecommendationChangeRequest.SuggestionHolder.from(request));

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

  // 추천 변경 제안 최대 개수를 계산한다.
  private int resolveSuggestionLimit(Integer requestLimit) {
    int requestedLimit = requestLimit == null || requestLimit <= 0 ? 5 : requestLimit;

    int configuredLimit =
        parsePositiveInt(
            learningAutomationPolicyService.getValue(
                LearningAutomationRuleCatalog.RECOMMENDATION_CHANGE_MAX_LIMIT,
                String.valueOf(requestedLimit)),
            requestedLimit);
    return Math.min(requestedLimit, configuredLimit);
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
    String reorderAfterNodeTitle = null;
    if (recommendationChange.getReorderAfterNodeId() != null) {
      reorderAfterNodeTitle =
          roadmapNodeRepository
              .findById(recommendationChange.getReorderAfterNodeId())
              .map(RoadmapNode::getTitle)
              .orElse(null);
    }
    return RecommendationChangeResponse.Detail.builder()
        .changeId(recommendationChange.getId())
        .sourceRecommendationId(recommendationChange.getSourceRecommendationId())
        .nodeId(recommendationChange.getRoadmapNode().getNodeId())
        .nodeTitle(recommendationChange.getRoadmapNode().getTitle())
        .nodeSortOrder(recommendationChange.getRoadmapNode().getSortOrder())
        .branchFromNodeId(recommendationChange.getBranchFromNodeId())
        .anchorCustomNodeId(recommendationChange.getAnchorCustomNodeId())
        .branchType(recommendationChange.getBranchType())
        .reorderAfterNodeId(recommendationChange.getReorderAfterNodeId())
        .reorderAfterNodeTitle(reorderAfterNodeTitle)
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

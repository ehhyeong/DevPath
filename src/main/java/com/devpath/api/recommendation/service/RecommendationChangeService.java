package com.devpath.api.recommendation.service;

import com.devpath.api.learning.service.SupplementRecommendationService;
import com.devpath.api.learning.service.TilService;
import com.devpath.api.learning.service.WeaknessAnalysisService;
import com.devpath.api.recommendation.dto.RecommendationChangeRequest;
import com.devpath.api.recommendation.dto.RecommendationChangeResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.automation.AutomationRuleStatus;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.automation.LearningAutomationRuleRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
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
    private final LearningAutomationRuleRepository learningAutomationRuleRepository;
    private final SupplementRecommendationService supplementRecommendationService;
    private final RecommendationHistoryService recommendationHistoryService;
    private final RiskWarningService riskWarningService;
    private final WeaknessAnalysisService weaknessAnalysisService;
    private final TilService tilService;

    @Transactional
    public List<RecommendationChangeResponse.Detail> createSuggestions(
        Long userId,
        RecommendationChangeRequest.Suggestion request
    ) {
        if (!isRuleEnabled("RECOMMENDATION_CHANGE_ENABLED", true)) {
            throw new CustomException(ErrorCode.LEARNING_RULE_DISABLED);
        }

        User user = validateUser(userId);

        if (request.getRoadmapId() != null) {
            roadmapRepository.findById(request.getRoadmapId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
        }

        int limit = resolveSuggestionLimit(request.getLimit());
        long tilSignalCount = tilService.getTilSignalCountForRecommendationChange(userId);
        boolean weaknessSignal = weaknessAnalysisService.hasLatestAnalysisSignalForRecommendationChange(userId);
        long riskWarningCount = riskWarningService.getUnacknowledgedWarningCountForRecommendationChange(userId);
        long recommendationHistoryCount =
            recommendationHistoryService.getRecentHistoryCountForRecommendationChange(userId);

        List<SupplementRecommendation> supplementRecommendations =
            supplementRecommendationService.getPendingRecommendationsForRecommendationChange(userId, request.getRoadmapId());

        return supplementRecommendations.stream()
            .limit(limit)
            .map(supplementRecommendation -> upsertChange(
                user,
                supplementRecommendation,
                buildReason(supplementRecommendation),
                buildContextSummary(tilSignalCount, weaknessSignal, riskWarningCount, recommendationHistoryCount)
            ))
            .map(this::toDetail)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<RecommendationChangeResponse.Detail> getRecommendationChanges(Long userId) {
        validateUser(userId);

        return recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
                userId,
                RecommendationChangeStatus.SUGGESTED
            )
            .stream()
            .map(this::toDetail)
            .toList();
    }

    @Transactional
    public RecommendationChangeResponse.Detail apply(Long userId, Long changeId) {
        RecommendationChange recommendationChange = recommendationChangeRepository.findByIdAndUserId(changeId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_CHANGE_NOT_FOUND));

        if (recommendationChange.getChangeStatus() != RecommendationChangeStatus.SUGGESTED) {
            throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
        }

        recommendationChange.apply();

        if (recommendationChange.getSourceRecommendationId() != null) {
            supplementRecommendationService.approveRecommendation(userId, recommendationChange.getSourceRecommendationId());
        }

        saveHistory(
            recommendationChange,
            "CHANGE_APPLY",
            RecommendationChangeStatus.SUGGESTED.name(),
            RecommendationChangeStatus.APPLIED.name()
        );

        return toDetail(recommendationChange);
    }

    @Transactional
    public RecommendationChangeResponse.Detail ignore(Long userId, Long changeId) {
        RecommendationChange recommendationChange = recommendationChangeRepository.findByIdAndUserId(changeId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_CHANGE_NOT_FOUND));

        if (recommendationChange.getChangeStatus() != RecommendationChangeStatus.SUGGESTED) {
            throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
        }

        recommendationChange.ignore();

        if (recommendationChange.getSourceRecommendationId() != null) {
            supplementRecommendationService.rejectRecommendation(userId, recommendationChange.getSourceRecommendationId());
        }

        saveHistory(
            recommendationChange,
            "CHANGE_IGNORE",
            RecommendationChangeStatus.SUGGESTED.name(),
            RecommendationChangeStatus.IGNORED.name()
        );

        return toDetail(recommendationChange);
    }

    @Transactional(readOnly = true)
    public List<RecommendationChangeResponse.HistoryItem> getHistories(Long userId) {
        validateUser(userId);

        return recommendationChangeRepository.findAllByUserIdAndChangeStatusInOrderByUpdatedAtDesc(
                userId,
                Set.of(
                    RecommendationChangeStatus.APPLIED,
                    RecommendationChangeStatus.IGNORED,
                    RecommendationChangeStatus.RECALCULATED
                )
            )
            .stream()
            .map(recommendationChange -> RecommendationChangeResponse.HistoryItem.builder()
                .changeId(recommendationChange.getId())
                .nodeId(recommendationChange.getRoadmapNode().getNodeId())
                .nodeTitle(recommendationChange.getRoadmapNode().getTitle())
                .changeStatus(recommendationChange.getChangeStatus().name())
                .decisionStatus(recommendationChange.getDecisionStatus().name())
                .updatedAt(recommendationChange.getUpdatedAt())
                .build())
            .toList();
    }

    @Transactional
    public RecommendationChangeResponse.RecalculateResult recalculateNextNodes(
        Long userId,
        RecommendationChangeRequest.RecalculateNextNodes request
    ) {
        validateUser(userId);

        List<RecommendationChange> currentPendingChanges =
            request.getRoadmapId() == null
                ? recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
                    userId,
                    RecommendationChangeStatus.SUGGESTED
                )
                : recommendationChangeRepository.findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
                    userId,
                    request.getRoadmapId(),
                    RecommendationChangeStatus.SUGGESTED
                );

        for (RecommendationChange currentPendingChange : currentPendingChanges) {
            currentPendingChange.markRecalculated();
        }

        List<RecommendationChangeResponse.Detail> regenerated = createSuggestions(
            userId,
            RecommendationChangeRequest.SuggestionHolder.from(request)
        );

        return RecommendationChangeResponse.RecalculateResult.builder()
            .recalculatedCount(currentPendingChanges.size())
            .items(regenerated)
            .build();
    }

    private RecommendationChange upsertChange(
        User user,
        SupplementRecommendation supplementRecommendation,
        String reason,
        String contextSummary
    ) {
        return recommendationChangeRepository
            .findTopByUserIdAndRoadmapNodeNodeIdAndChangeStatusOrderByCreatedAtDesc(
                user.getId(),
                supplementRecommendation.getRoadmapNode().getNodeId(),
                RecommendationChangeStatus.SUGGESTED
            )
            .orElseGet(() -> recommendationChangeRepository.save(
                RecommendationChange.builder()
                    .user(user)
                    .roadmapNode(supplementRecommendation.getRoadmapNode())
                    .sourceRecommendationId(supplementRecommendation.getId())
                    .reason(reason)
                    .contextSummary(contextSummary)
                    .build()
            ));
    }

    private String buildReason(SupplementRecommendation supplementRecommendation) {
        if (supplementRecommendation.getReason() != null && !supplementRecommendation.getReason().isBlank()) {
            return supplementRecommendation.getReason();
        }

        return "Generated a recommendation change from the existing supplement recommendation flow.";
    }

    private String buildContextSummary(
        long tilSignalCount,
        boolean weaknessSignal,
        long riskWarningCount,
        long recommendationHistoryCount
    ) {
        return "tilCount=" + tilSignalCount
            + ", weaknessSignal=" + weaknessSignal
            + ", warningCount=" + riskWarningCount
            + ", historyCount=" + recommendationHistoryCount;
    }

    private void saveHistory(
        RecommendationChange recommendationChange,
        String actionType,
        String beforeStatus,
        String afterStatus
    ) {
        recommendationHistoryRepository.save(
            RecommendationHistory.builder()
                .user(recommendationChange.getUser())
                .recommendationId(recommendationChange.getId())
                .roadmapNode(recommendationChange.getRoadmapNode())
                .beforeStatus(beforeStatus)
                .afterStatus(afterStatus)
                .actionType(actionType)
                .context(recommendationChange.getContextSummary())
                .build()
        );
    }

    // 룰 활성 여부를 조회한다.
    private boolean isRuleEnabled(String ruleKey, boolean defaultValue) {
        return learningAutomationRuleRepository.findTopByRuleKeyOrderByPriorityDescIdDesc(ruleKey)
            .map(rule -> AutomationRuleStatus.ENABLED.equals(rule.getStatus()))
            .orElse(defaultValue);
    }

    // 추천 변경 제안 최대 개수를 계산한다.
    private int resolveSuggestionLimit(Integer requestLimit) {
        int requestedLimit = requestLimit == null || requestLimit <= 0 ? 5 : requestLimit;

        return learningAutomationRuleRepository.findTopByRuleKeyOrderByPriorityDescIdDesc("RECOMMENDATION_CHANGE_MAX_LIMIT")
            .map(rule -> parsePositiveInt(rule.getRuleValue(), requestedLimit))
            .map(configuredLimit -> Math.min(requestedLimit, configuredLimit))
            .orElse(requestedLimit);
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

        return userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private RecommendationChangeResponse.Detail toDetail(RecommendationChange recommendationChange) {
        return RecommendationChangeResponse.Detail.builder()
            .changeId(recommendationChange.getId())
            .sourceRecommendationId(recommendationChange.getSourceRecommendationId())
            .nodeId(recommendationChange.getRoadmapNode().getNodeId())
            .nodeTitle(recommendationChange.getRoadmapNode().getTitle())
            .reason(recommendationChange.getReason())
            .contextSummary(recommendationChange.getContextSummary())
            .changeStatus(recommendationChange.getChangeStatus().name())
            .decisionStatus(recommendationChange.getDecisionStatus().name())
            .suggestedAt(recommendationChange.getSuggestedAt())
            .appliedAt(recommendationChange.getAppliedAt())
            .ignoredAt(recommendationChange.getIgnoredAt())
            .build();
    }
}

package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.SupplementRecommendationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.learning.repository.recommendation.RiskWarningRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupplementRecommendationService {

    private final SupplementRecommendationRepository supplementRecommendationRepository;
    private final RoadmapNodeRepository roadmapNodeRepository;
    private final NodeRequiredTagRepository nodeRequiredTagRepository;
    private final RecommendationHistoryRepository recommendationHistoryRepository;
    private final RiskWarningRepository riskWarningRepository;
    private final UserRepository userRepository;
    private final UserTechStackRepository userTechStackRepository;

    // 한글 주석: 수동 생성 API도 동일한 보강 메타데이터와 변경 이력을 남기도록 맞춘다.
    @Transactional
    public SupplementRecommendationResponse createRecommendation(Long userId, Long nodeId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        RoadmapNode node = roadmapNodeRepository.findById(nodeId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

        RecommendationMetrics metrics = calculateMetrics(userId, nodeId);
        SupplementRecommendation recommendation = SupplementRecommendation.builder()
                .user(user)
                .roadmapNode(node)
                .reason(reason)
                .priority(metrics.priority())
                .coveragePercent(metrics.coveragePercent())
                .missingTagCount(metrics.missingTagCount())
                .build();

        SupplementRecommendation saved = supplementRecommendationRepository.save(recommendation);
        saveHistory(user, saved, null, saved.getStatus(), "CREATED", saved.getReason());
        createRiskWarningIfNeeded(user, node, metrics);
        return SupplementRecommendationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SupplementRecommendationResponse> getRecommendations(Long userId, RecommendationStatus status) {
        List<SupplementRecommendation> recommendations;

        if (status != null) {
            recommendations = supplementRecommendationRepository
                    .findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                    .filter(recommendation -> recommendation.getStatus() == status)
                    .collect(Collectors.toList());
        } else {
            recommendations = supplementRecommendationRepository
                    .findAllByUserIdOrderByCreatedAtDesc(userId);
        }

        return recommendations.stream()
                .map(SupplementRecommendationResponse::from)
                .collect(Collectors.toList());
    }

    // 한글 주석: 수동 보강 추천도 승인 이력을 recommendation_histories에 남긴다.
    @Transactional
    public SupplementRecommendationResponse approveRecommendation(Long userId, Long recommendationId) {
        SupplementRecommendation recommendation = supplementRecommendationRepository
                .findById(recommendationId)
                .orElseThrow(() -> new CustomException(ErrorCode.SUPPLEMENT_RECOMMENDATION_NOT_FOUND));

        if (!recommendation.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        RecommendationStatus beforeStatus = recommendation.getStatus();
        recommendation.approve();
        saveHistory(
                recommendation.getUser(),
                recommendation,
                beforeStatus,
                recommendation.getStatus(),
                "APPROVED",
                recommendation.getReason()
        );
        return SupplementRecommendationResponse.from(recommendation);
    }

    // 한글 주석: 거절도 동일하게 before/after 상태를 남겨 이력 조회 API와 연결한다.
    @Transactional
    public SupplementRecommendationResponse rejectRecommendation(Long userId, Long recommendationId) {
        SupplementRecommendation recommendation = supplementRecommendationRepository
                .findById(recommendationId)
                .orElseThrow(() -> new CustomException(ErrorCode.SUPPLEMENT_RECOMMENDATION_NOT_FOUND));

        if (!recommendation.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        RecommendationStatus beforeStatus = recommendation.getStatus();
        recommendation.reject();
        saveHistory(
                recommendation.getUser(),
                recommendation,
                beforeStatus,
                recommendation.getStatus(),
                "REJECTED",
                recommendation.getReason()
        );
        return SupplementRecommendationResponse.from(recommendation);
    }

    private RecommendationMetrics calculateMetrics(Long userId, Long nodeId) {
        List<String> requiredTags = nodeRequiredTagRepository.findTagNamesByNodeId(nodeId);
        Set<String> userSkills = new LinkedHashSet<>(userTechStackRepository.findTagNamesByUserId(userId));

        long matchedCount = requiredTags.stream()
                .filter(userSkills::contains)
                .count();
        int missingTagCount = requiredTags.size() - (int) matchedCount;
        double coveragePercent = requiredTags.isEmpty()
                ? 100.0
                : (matchedCount * 100.0) / requiredTags.size();

        return new RecommendationMetrics(
                determinePriority(missingTagCount, coveragePercent),
                coveragePercent,
                missingTagCount
        );
    }

    private Integer determinePriority(int missingTagCount, double coveragePercent) {
        if (missingTagCount > 0 && coveragePercent < 50.0) {
            return 1;
        }
        if (missingTagCount > 0 || coveragePercent < 80.0) {
            return 2;
        }
        return 3;
    }

    private void saveHistory(
            User user,
            SupplementRecommendation recommendation,
            RecommendationStatus beforeStatus,
            RecommendationStatus afterStatus,
            String actionType,
            String context
    ) {
        recommendationHistoryRepository.save(
                RecommendationHistory.builder()
                        .user(user)
                        .recommendationId(recommendation.getId())
                        .roadmapNode(recommendation.getRoadmapNode())
                        .beforeStatus(beforeStatus == null ? null : beforeStatus.name())
                        .afterStatus(afterStatus == null ? null : afterStatus.name())
                        .actionType(actionType)
                        .context(context)
                        .build()
        );
    }

    private void createRiskWarningIfNeeded(User user, RoadmapNode node, RecommendationMetrics metrics) {
        if (metrics.missingTagCount() > 0 && metrics.coveragePercent() < 50.0) {
            riskWarningRepository.save(
                    RiskWarning.builder()
                            .user(user)
                            .roadmapNode(node)
                            .warningType("DIFFICULTY_TOO_HIGH")
                            .riskLevel("HIGH")
                            .message("현재 보유 태그 대비 난도가 높아 먼저 기초 보강이 필요합니다.")
                            .build()
            );
            return;
        }

        if (metrics.missingTagCount() > 0) {
            riskWarningRepository.save(
                    RiskWarning.builder()
                            .user(user)
                            .roadmapNode(node)
                            .warningType("PREREQUISITE_MISSING")
                            .riskLevel("MEDIUM")
                            .message("필수 선수 지식이 일부 비어 있어 선행 학습을 권장합니다.")
                            .build()
            );
        }
    }

    private record RecommendationMetrics(
            Integer priority,
            Double coveragePercent,
            Integer missingTagCount
    ) {
    }
}

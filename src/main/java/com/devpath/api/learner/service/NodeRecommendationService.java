package com.devpath.api.learner.service;

import com.devpath.api.roadmap.service.CustomRoadmapCopyService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.learning.repository.recommendation.RiskWarningRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.RecommendationStatus;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRecommendationRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NodeRecommendationService {

    private final NodeRecommendationRepository nodeRecommendationRepository;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;
    private final RoadmapNodeRepository roadmapNodeRepository;
    private final NodeRequiredTagRepository nodeRequiredTagRepository;
    private final UserTechStackRepository userTechStackRepository;
    private final CustomRoadmapRepository customRoadmapRepository;
    private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
    private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
    private final PrerequisiteRepository prerequisiteRepository;
    private final CustomRoadmapCopyService customRoadmapCopyService;
    private final RecommendationHistoryRepository recommendationHistoryRepository;
    private final RiskWarningRepository riskWarningRepository;
    private final SupplementRecommendationRepository supplementRecommendationRepository;

    @Transactional
    public List<NodeRecommendation> generateRecommendations(Long userId, Long roadmapId) {
        User user = getUser(userId);
        Roadmap roadmap = getRoadmap(roadmapId);

        List<NodeRecommendation> existingPending = nodeRecommendationRepository
                .findByUser_IdAndRoadmap_RoadmapIdAndStatus(userId, roadmapId, RecommendationStatus.PENDING);

        existingPending.forEach(recommendation -> {
            RecommendationStatus beforeStatus = recommendation.getStatus();
            recommendation.expire();
            saveHistory(
                    user,
                    recommendation.getRecommendationId(),
                    recommendation.getRecommendedNode(),
                    beforeStatus.name(),
                    recommendation.getStatus().name(),
                    "EXPIRED",
                    "새 추천 생성 전에 기존 대기 추천을 만료 처리했습니다."
            );
        });

        List<RoadmapNode> roadmapNodes = roadmapNodeRepository.findByRoadmapOrderBySortOrderAsc(roadmap);
        if (roadmapNodes.isEmpty()) {
            return List.of();
        }

        Set<String> userSkills = new LinkedHashSet<>(userTechStackRepository.findTagNamesByUserId(userId));
        Set<Long> completedNodeIds = getCompletedNodeIds(userId, roadmapId);
        Map<Long, List<String>> requiredTagsByNodeId = getRequiredTagsByNodeId(roadmapNodes);

        List<RecommendationCandidate> candidates = roadmapNodes.stream()
                .filter(node -> !completedNodeIds.contains(node.getNodeId()))
                .map(node -> toCandidate(node, requiredTagsByNodeId.getOrDefault(node.getNodeId(), List.of()), userSkills))
                .sorted(
                        Comparator.comparing(RecommendationCandidate::coveragePercent).reversed()
                                .thenComparing(RecommendationCandidate::missingCount)
                                .thenComparing(candidate -> candidate.node().getSortOrder())
                                .thenComparing(candidate -> candidate.node().getNodeId())
                )
                .toList();

        if (candidates.isEmpty()) {
            return List.of();
        }

        RecommendationCandidate remedialCandidate = candidates.stream()
                .filter(candidate -> candidate.coveragePercent() < 100.0)
                .filter(candidate -> candidate.coveragePercent() > 0.0 || !candidate.requiredTags().isEmpty())
                .findFirst()
                .orElse(null);

        RecommendationCandidate advancedCandidate = candidates.stream()
                .filter(candidate -> candidate.coveragePercent() >= 100.0)
                .filter(candidate -> remedialCandidate == null
                        || !candidate.node().getNodeId().equals(remedialCandidate.node().getNodeId()))
                .findFirst()
                .orElse(null);

        RecommendationCandidate optionalCandidate = candidates.stream()
                .filter(candidate -> remedialCandidate == null
                        || !candidate.node().getNodeId().equals(remedialCandidate.node().getNodeId()))
                .filter(candidate -> advancedCandidate == null
                        || !candidate.node().getNodeId().equals(advancedCandidate.node().getNodeId()))
                .findFirst()
                .orElse(null);

        List<NodeRecommendation> recommendations = new ArrayList<>();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);

        if (remedialCandidate != null) {
            NodeRecommendation recommendation = nodeRecommendationRepository.save(
                    NodeRecommendation.builder()
                            .user(user)
                            .roadmap(roadmap)
                            .recommendedNode(remedialCandidate.node())
                            .recommendationType(NodeRecommendation.RecommendationType.REMEDIAL)
                            .reason(buildRemedialReason(remedialCandidate))
                            .priority(1)
                            .expiresAt(expiresAt)
                            .build()
            );

            recommendations.add(recommendation);
            saveGeneratedArtifacts(user, recommendation, remedialCandidate);
        }

        if (advancedCandidate != null) {
            NodeRecommendation recommendation = nodeRecommendationRepository.save(
                    NodeRecommendation.builder()
                            .user(user)
                            .roadmap(roadmap)
                            .recommendedNode(advancedCandidate.node())
                            .recommendationType(NodeRecommendation.RecommendationType.ADVANCED)
                            .reason(buildAdvancedReason(advancedCandidate))
                            .priority(recommendations.size() + 1)
                            .expiresAt(expiresAt)
                            .build()
            );

            recommendations.add(recommendation);
            saveGeneratedArtifacts(user, recommendation, advancedCandidate);
        } else if (optionalCandidate != null) {
            NodeRecommendation recommendation = nodeRecommendationRepository.save(
                    NodeRecommendation.builder()
                            .user(user)
                            .roadmap(roadmap)
                            .recommendedNode(optionalCandidate.node())
                            .recommendationType(NodeRecommendation.RecommendationType.OPTIONAL)
                            .reason(buildOptionalReason(optionalCandidate))
                            .priority(recommendations.size() + 1)
                            .expiresAt(expiresAt)
                            .build()
            );

            recommendations.add(recommendation);
            saveGeneratedArtifacts(user, recommendation, optionalCandidate);
        }

        return recommendations;
    }

    public List<NodeRecommendation> getRecommendations(Long userId, Long roadmapId) {
        getUser(userId);
        getRoadmap(roadmapId);
        return nodeRecommendationRepository.findByUser_IdAndRoadmap_RoadmapId(userId, roadmapId);
    }

    public List<NodeRecommendation> getPendingRecommendations(Long userId, Long roadmapId) {
        getUser(userId);
        getRoadmap(roadmapId);

        List<NodeRecommendation> pending = nodeRecommendationRepository
                .findByUser_IdAndRoadmap_RoadmapIdAndStatus(userId, roadmapId, RecommendationStatus.PENDING);

        pending.stream()
                .filter(NodeRecommendation::isExpired)
                .forEach(recommendation -> {
                    RecommendationStatus beforeStatus = recommendation.getStatus();
                    recommendation.expire();
                    saveHistory(
                            recommendation.getUser(),
                            recommendation.getRecommendationId(),
                            recommendation.getRecommendedNode(),
                            beforeStatus.name(),
                            recommendation.getStatus().name(),
                            "EXPIRED",
                            "조회 시점에 만료된 추천을 자동 만료 처리했습니다."
                    );
                });

        return pending.stream()
                .filter(rec -> !rec.isExpired())
                .toList();
    }

    @Transactional
    public NodeRecommendation acceptRecommendation(Long userId, Long recommendationId) {
        getUser(userId);
        NodeRecommendation recommendation = getOwnedRecommendation(userId, recommendationId);

        validatePendingRecommendation(recommendation);

        RecommendationStatus beforeStatus = recommendation.getStatus();
        CustomRoadmap customRoadmap = getOrCreateCustomRoadmap(userId, recommendation.getRoadmap());
        ensureRecommendedNodeExists(customRoadmap, recommendation.getRecommendedNode());

        recommendation.accept();

        saveHistory(
                recommendation.getUser(),
                recommendation.getRecommendationId(),
                recommendation.getRecommendedNode(),
                beforeStatus.name(),
                recommendation.getStatus().name(),
                "ACCEPTED",
                recommendation.getReason()
        );

        syncSupplementRecommendationStatus(
                recommendation.getUser().getId(),
                recommendation.getRecommendedNode().getNodeId(),
                true
        );

        return recommendation;
    }

    @Transactional
    public NodeRecommendation rejectRecommendation(Long userId, Long recommendationId) {
        getUser(userId);
        NodeRecommendation recommendation = getOwnedRecommendation(userId, recommendationId);

        if (!recommendation.isPending()) {
            throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
        }

        RecommendationStatus beforeStatus = recommendation.getStatus();
        recommendation.reject();

        saveHistory(
                recommendation.getUser(),
                recommendation.getRecommendationId(),
                recommendation.getRecommendedNode(),
                beforeStatus.name(),
                recommendation.getStatus().name(),
                "REJECTED",
                recommendation.getReason()
        );

        syncSupplementRecommendationStatus(
                recommendation.getUser().getId(),
                recommendation.getRecommendedNode().getNodeId(),
                false
        );

        return recommendation;
    }

    @Transactional
    public NodeRecommendation expireRecommendation(Long userId, Long recommendationId) {
        getUser(userId);
        NodeRecommendation recommendation = getOwnedRecommendation(userId, recommendationId);

        RecommendationStatus beforeStatus = recommendation.getStatus();
        recommendation.expire();

        saveHistory(
                recommendation.getUser(),
                recommendation.getRecommendationId(),
                recommendation.getRecommendedNode(),
                beforeStatus.name(),
                recommendation.getStatus().name(),
                "EXPIRED",
                "학습자가 추천을 수동 만료 처리했습니다."
        );

        return recommendation;
    }

    @Transactional
    public void processExpiredRecommendations(Long userId, Long roadmapId) {
        List<NodeRecommendation> expired = nodeRecommendationRepository
                .findExpiredRecommendations(userId, roadmapId, LocalDateTime.now());

        expired.forEach(recommendation -> {
            RecommendationStatus beforeStatus = recommendation.getStatus();
            recommendation.expire();

            saveHistory(
                    recommendation.getUser(),
                    recommendation.getRecommendationId(),
                    recommendation.getRecommendedNode(),
                    beforeStatus.name(),
                    recommendation.getStatus().name(),
                    "EXPIRED",
                    "만료 시간이 지나 자동 만료 처리되었습니다."
            );
        });
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Roadmap getRoadmap(Long roadmapId) {
        return roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
    }

    private NodeRecommendation getOwnedRecommendation(Long userId, Long recommendationId) {
        return nodeRecommendationRepository.findByRecommendationIdAndUser_Id(recommendationId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_NOT_FOUND));
    }

    private void validatePendingRecommendation(NodeRecommendation recommendation) {
        if (!recommendation.isPending()) {
            throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
        }

        if (recommendation.isExpired()) {
            recommendation.expire();

            saveHistory(
                    recommendation.getUser(),
                    recommendation.getRecommendationId(),
                    recommendation.getRecommendedNode(),
                    RecommendationStatus.PENDING.name(),
                    recommendation.getStatus().name(),
                    "EXPIRED",
                    "만료된 추천이라 처리할 수 없습니다."
            );

            throw new CustomException(ErrorCode.RECOMMENDATION_EXPIRED);
        }
    }

    private Set<Long> getCompletedNodeIds(Long userId, Long roadmapId) {
        return customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId)
                .map(customRoadmap -> customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap).stream()
                        .filter(customNode -> customNode.getStatus() == NodeStatus.COMPLETED)
                        .map(customNode -> customNode.getOriginalNode().getNodeId())
                        .collect(java.util.stream.Collectors.toSet()))
                .orElse(Set.of());
    }

    private Map<Long, List<String>> getRequiredTagsByNodeId(List<RoadmapNode> roadmapNodes) {
        List<Long> nodeIds = roadmapNodes.stream()
                .map(RoadmapNode::getNodeId)
                .toList();

        Map<Long, Set<String>> requiredTagsByNodeId = new LinkedHashMap<>();
        for (NodeRequiredTagRepository.NodeRequiredTagNameProjection row : nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds)) {
            requiredTagsByNodeId
                    .computeIfAbsent(row.getNodeId(), ignored -> new LinkedHashSet<>())
                    .add(row.getTagName());
        }

        Map<Long, List<String>> result = new LinkedHashMap<>();
        for (Long nodeId : nodeIds) {
            result.put(nodeId, List.copyOf(requiredTagsByNodeId.getOrDefault(nodeId, new LinkedHashSet<>())));
        }
        return result;
    }

    private RecommendationCandidate toCandidate(
            RoadmapNode node,
            List<String> requiredTags,
            Set<String> userSkills
    ) {
        long matchedCount = requiredTags.stream()
                .filter(userSkills::contains)
                .count();

        int requiredCount = requiredTags.size();
        int missingCount = requiredCount - (int) matchedCount;
        double coveragePercent = requiredCount == 0 ? 100.0 : (matchedCount * 100.0) / requiredCount;

        return new RecommendationCandidate(node, requiredTags, (int) matchedCount, missingCount, coveragePercent);
    }

    private String buildRemedialReason(RecommendationCandidate candidate) {
        if (candidate.requiredTags().isEmpty()) {
            return "기초 진입 노드라서 바로 시작해도 좋습니다.";
        }

        return "필수 태그 " + candidate.requiredTags().size()
                + "개 중 " + candidate.matchedCount()
                + "개를 보유해 부족한 역량을 보완하기 좋습니다.";
    }

    private String buildAdvancedReason(RecommendationCandidate candidate) {
        if (candidate.requiredTags().isEmpty()) {
            return "선행 태그 없이 바로 시작할 수 있는 노드입니다.";
        }

        return "현재 보유 태그로 바로 학습할 수 있는 다음 단계 노드입니다.";
    }

    private String buildOptionalReason(RecommendationCandidate candidate) {
        return "현재 태그와 일부 맞아 추가 학습 후보로 추천합니다.";
    }

    private CustomRoadmap getOrCreateCustomRoadmap(Long userId, Roadmap roadmap) {
        return customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmap.getRoadmapId())
                .orElseGet(() -> {
                    customRoadmapCopyService.copyToCustomRoadmap(userId, roadmap.getRoadmapId());

                    return customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmap.getRoadmapId())
                            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
                });
    }

    private void ensureRecommendedNodeExists(CustomRoadmap customRoadmap, RoadmapNode recommendedNode) {
        if (customRoadmapNodeRepository.findByCustomRoadmapAndOriginalNode(customRoadmap, recommendedNode).isPresent()) {
            return;
        }

        CustomRoadmapNode customRoadmapNode = customRoadmapNodeRepository.save(
                CustomRoadmapNode.builder()
                        .customRoadmap(customRoadmap)
                        .originalNode(recommendedNode)
                        .build()
        );

        List<CustomNodePrerequisite> prerequisitesToSave = prerequisiteRepository.findAllByNode(recommendedNode).stream()
                .map(prerequisite -> toCustomPrerequisite(customRoadmap, customRoadmapNode, prerequisite))
                .filter(java.util.Objects::nonNull)
                .toList();

        if (!prerequisitesToSave.isEmpty()) {
            customNodePrerequisiteRepository.saveAll(prerequisitesToSave);
        }
    }

    private CustomNodePrerequisite toCustomPrerequisite(
            CustomRoadmap customRoadmap,
            CustomRoadmapNode customRoadmapNode,
            Prerequisite prerequisite
    ) {
        return customRoadmapNodeRepository.findByCustomRoadmapAndOriginalNode(
                        customRoadmap,
                        prerequisite.getPreNode()
                )
                .map(prerequisiteNode -> CustomNodePrerequisite.builder()
                        .customRoadmap(customRoadmap)
                        .customNode(customRoadmapNode)
                        .prerequisiteCustomNode(prerequisiteNode)
                        .build())
                .orElse(null);
    }

    private void saveGeneratedArtifacts(User user, NodeRecommendation recommendation, RecommendationCandidate candidate) {
        supplementRecommendationRepository.save(
                SupplementRecommendation.builder()
                        .user(user)
                        .roadmapNode(recommendation.getRecommendedNode())
                        .reason(recommendation.getReason())
                        .priority(recommendation.getPriority())
                        .coveragePercent(candidate.coveragePercent())
                        .missingTagCount(candidate.missingCount())
                        .build()
        );

        saveHistory(
                user,
                recommendation.getRecommendationId(),
                recommendation.getRecommendedNode(),
                null,
                recommendation.getStatus().name(),
                "GENERATED",
                recommendation.getReason()
        );

        createRiskWarningsIfNeeded(user, candidate);
    }

    private void saveHistory(
            User user,
            Long recommendationId,
            RoadmapNode roadmapNode,
            String beforeStatus,
            String afterStatus,
            String actionType,
            String context
    ) {
        recommendationHistoryRepository.save(
                RecommendationHistory.builder()
                        .user(user)
                        .recommendationId(recommendationId)
                        .roadmapNode(roadmapNode)
                        .beforeStatus(beforeStatus)
                        .afterStatus(afterStatus)
                        .actionType(actionType)
                        .context(context)
                        .build()
        );
    }

    private void createRiskWarningsIfNeeded(User user, RecommendationCandidate candidate) {
        if (candidate.missingCount() > 0 && candidate.coveragePercent() < 50.0) {
            riskWarningRepository.save(
                    RiskWarning.builder()
                            .user(user)
                            .roadmapNode(candidate.node())
                            .warningType("DIFFICULTY_TOO_HIGH")
                            .riskLevel("HIGH")
                            .message("현재 태그 커버리지가 낮아 난이도가 높을 수 있습니다.")
                            .build()
            );
            return;
        }

        if (candidate.missingCount() > 0) {
            riskWarningRepository.save(
                    RiskWarning.builder()
                            .user(user)
                            .roadmapNode(candidate.node())
                            .warningType("PREREQUISITE_MISSING")
                            .riskLevel("MEDIUM")
                            .message("필수 태그가 일부 부족하여 선행 학습이 필요할 수 있습니다.")
                            .build()
            );
            return;
        }

        if (candidate.coveragePercent() >= 100.0) {
            riskWarningRepository.save(
                    RiskWarning.builder()
                            .user(user)
                            .roadmapNode(candidate.node())
                            .warningType("OPTIONAL_LOW_RISK")
                            .riskLevel("LOW")
                            .message("현재 역량으로 바로 학습 가능한 추천 노드입니다.")
                            .build()
            );
        }
    }

    private void syncSupplementRecommendationStatus(Long userId, Long nodeId, boolean accepted) {
        supplementRecommendationRepository
                .findTopByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(userId, nodeId)
                .ifPresent(supplementRecommendation -> {
                    if (accepted) {
                        supplementRecommendation.approve();
                    } else {
                        supplementRecommendation.reject();
                    }
                });
    }

    private record RecommendationCandidate(
            RoadmapNode node,
            List<String> requiredTags,
            int matchedCount,
            int missingCount,
            double coveragePercent
    ) {
    }
}

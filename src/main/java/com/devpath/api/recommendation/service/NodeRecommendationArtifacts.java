package com.devpath.api.recommendation.service;

import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.learning.repository.recommendation.RiskWarningRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NodeRecommendationArtifacts {

  private final RecommendationHistoryRepository recommendationHistoryRepository;
  private final RiskWarningRepository riskWarningRepository;
  private final SupplementRecommendationRepository supplementRecommendationRepository;

  void saveGenerated(
      User user,
      NodeRecommendation recommendation,
      double coveragePercent,
      int missingTagCount,
      int averageProgressPercent) {
    supplementRecommendationRepository.save(
        SupplementRecommendation.builder()
            .user(user)
            .roadmapNode(recommendation.getRecommendedNode())
            .reason(recommendation.getReason())
            .priority(recommendation.getPriority())
            .coveragePercent(coveragePercent)
            .missingTagCount(missingTagCount)
            .build());

    saveHistory(
        user,
        recommendation.getRecommendationId(),
        recommendation.getRecommendedNode(),
        null,
        recommendation.getStatus().name(),
        "GENERATED",
        recommendation.getReason());
    createRiskWarning(
        user,
        recommendation.getRecommendedNode(),
        coveragePercent,
        missingTagCount,
        averageProgressPercent);
  }

  void saveHistory(
      User user,
      Long recommendationId,
      RoadmapNode roadmapNode,
      String beforeStatus,
      String afterStatus,
      String actionType,
      String context) {
    recommendationHistoryRepository.save(
        RecommendationHistory.builder()
            .user(user)
            .recommendationId(recommendationId)
            .roadmapNode(roadmapNode)
            .beforeStatus(beforeStatus)
            .afterStatus(afterStatus)
            .actionType(actionType)
            .context(context)
            .build());
  }

  void syncSupplementStatus(Long userId, Long nodeId, boolean accepted) {
    supplementRecommendationRepository
        .findTopByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(userId, nodeId)
        .ifPresent(
            supplementRecommendation -> {
              if (accepted) {
                supplementRecommendation.approve();
              } else {
                supplementRecommendation.reject();
              }
            });
  }

  private void createRiskWarning(
      User user,
      RoadmapNode node,
      double coveragePercent,
      int missingTagCount,
      int averageProgressPercent) {
    if (averageProgressPercent < 30 && missingTagCount > 0) {
      saveRiskWarning(
          user,
          node,
          "LOW_LEARNING_PROGRESS",
          "HIGH",
          "Average lesson progress is still low, so this node may feel difficult right now.");
      return;
    }
    if (missingTagCount > 0 && coveragePercent < 50.0) {
      saveRiskWarning(user, node, "DIFFICULTY_TOO_HIGH", "HIGH", "현재 태그 커버리지가 낮아 난이도가 높을 수 있습니다.");
      return;
    }
    if (missingTagCount > 0) {
      saveRiskWarning(
          user, node, "PREREQUISITE_MISSING", "MEDIUM", "필수 태그가 일부 부족하여 선행 학습이 필요할 수 있습니다.");
      return;
    }
    if (coveragePercent >= 100.0) {
      saveRiskWarning(user, node, "OPTIONAL_LOW_RISK", "LOW", "현재 역량으로 바로 학습 가능한 추천 노드입니다.");
    }
  }

  private void saveRiskWarning(
      User user, RoadmapNode node, String warningType, String riskLevel, String message) {
    riskWarningRepository.save(
        RiskWarning.builder()
            .user(user)
            .roadmapNode(node)
            .warningType(warningType)
            .riskLevel(riskLevel)
            .message(message)
            .build());
  }
}

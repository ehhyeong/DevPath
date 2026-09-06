package com.devpath.domain.learning.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupplementRecommendationLifecycleService {

  private final SupplementRecommendationRepository supplementRecommendationRepository;
  private final RecommendationHistoryRepository recommendationHistoryRepository;

  @Transactional
  public void recordCreated(SupplementRecommendation recommendation) {
    saveHistory(
        recommendation.getUser(),
        recommendation,
        null,
        recommendation.getStatus(),
        "CREATED",
        recommendation.getReason());
  }

  @Transactional
  public SupplementRecommendation approve(Long userId, Long recommendationId) {
    SupplementRecommendation recommendation = getOwnedRecommendation(userId, recommendationId);
    RecommendationStatus beforeStatus = recommendation.getStatus();
    recommendation.approve();
    saveHistory(
        recommendation.getUser(),
        recommendation,
        beforeStatus,
        recommendation.getStatus(),
        "APPROVED",
        recommendation.getReason());
    return recommendation;
  }

  @Transactional
  public SupplementRecommendation reject(Long userId, Long recommendationId) {
    SupplementRecommendation recommendation = getOwnedRecommendation(userId, recommendationId);
    RecommendationStatus beforeStatus = recommendation.getStatus();
    recommendation.reject();
    saveHistory(
        recommendation.getUser(),
        recommendation,
        beforeStatus,
        recommendation.getStatus(),
        "REJECTED",
        recommendation.getReason());
    return recommendation;
  }

  private SupplementRecommendation getOwnedRecommendation(Long userId, Long recommendationId) {
    SupplementRecommendation recommendation =
        supplementRecommendationRepository
            .findById(recommendationId)
            .orElseThrow(() -> new CustomException(ErrorCode.SUPPLEMENT_RECOMMENDATION_NOT_FOUND));
    if (!recommendation.getUser().getId().equals(userId)) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }
    return recommendation;
  }

  private void saveHistory(
      User user,
      SupplementRecommendation recommendation,
      RecommendationStatus beforeStatus,
      RecommendationStatus afterStatus,
      String actionType,
      String context) {
    recommendationHistoryRepository.save(
        RecommendationHistory.builder()
            .user(user)
            .recommendationId(recommendation.getId())
            .roadmapNode(recommendation.getRoadmapNode())
            .beforeStatus(beforeStatus == null ? null : beforeStatus.name())
            .afterStatus(afterStatus == null ? null : afterStatus.name())
            .actionType(actionType)
            .context(context)
            .build());
  }
}

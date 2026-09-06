package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.RecommendationHistoryResponse;
import com.devpath.api.learning.dto.RiskWarningResponse;
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
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import com.devpath.domain.learning.service.LearningAutomationRuleCatalog;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupplementRecommendationQueryService {

  private final SupplementRecommendationRepository supplementRecommendationRepository;
  private final RecommendationHistoryRepository recommendationHistoryRepository;
  private final RiskWarningRepository riskWarningRepository;
  private final UserRepository userRepository;
  private final LearningAutomationPolicyService learningAutomationPolicyService;

  public List<SupplementRecommendationResponse> getRecommendations(
      Long userId, RecommendationStatus status) {
    List<SupplementRecommendation> recommendations;

    if (status != null) {
      recommendations =
          supplementRecommendationRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
              .filter(recommendation -> recommendation.getStatus() == status)
              .collect(Collectors.toList());
    } else {
      recommendations =
          supplementRecommendationRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    }

    var stream = recommendations.stream();
    if ("MISSING_TAG_COUNT_DESC"
        .equals(
            learningAutomationPolicyService.getValue(
                LearningAutomationRuleCatalog.SUPPLEMENT_RECOMMENDATION_PRIORITY,
                "MISSING_TAG_COUNT_DESC"))) {
      stream =
          stream.sorted(
              Comparator.comparing(
                      SupplementRecommendation::getMissingTagCount,
                      Comparator.nullsLast(Comparator.reverseOrder()))
                  .thenComparing(
                      SupplementRecommendation::getCoveragePercent,
                      Comparator.nullsLast(Comparator.naturalOrder()))
                  .thenComparing(
                      SupplementRecommendation::getCreatedAt,
                      Comparator.nullsLast(Comparator.reverseOrder())));
    }
    return stream.map(SupplementRecommendationResponse::from).collect(Collectors.toList());
  }

  public List<SupplementRecommendationResponse> getRecommendationsForHistory(Long userId) {
    return getRecommendations(userId, null);
  }

  public List<RecommendationHistoryResponse> getRecommendationHistories(
      Long userId, Long recommendationId, Long nodeId) {
    validateUser(userId);

    List<RecommendationHistory> histories;
    if (recommendationId != null) {
      histories =
          recommendationHistoryRepository.findAllByUserIdAndRecommendationIdOrderByCreatedAtDesc(
              userId, recommendationId);
    } else if (nodeId != null) {
      histories =
          recommendationHistoryRepository.findAllByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(
              userId, nodeId);
    } else {
      histories = recommendationHistoryRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    }

    return histories.stream().map(RecommendationHistoryResponse::from).toList();
  }

  public List<RiskWarningResponse> getRiskWarnings(
      Long userId, Boolean unacknowledgedOnly, Long nodeId) {
    validateUser(userId);

    List<RiskWarning> warnings;
    if (nodeId != null) {
      warnings =
          riskWarningRepository.findAllByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(
              userId, nodeId);
    } else if (Boolean.TRUE.equals(unacknowledgedOnly)) {
      warnings =
          riskWarningRepository.findAllByUserIdAndIsAcknowledgedFalseOrderByCreatedAtDesc(userId);
    } else {
      warnings = riskWarningRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    }

    return warnings.stream().map(RiskWarningResponse::from).toList();
  }

  private void validateUser(Long userId) {
    if (userId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }
}

package com.devpath.api.learning.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.devpath.api.learning.dto.SupplementRecommendationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.learning.repository.recommendation.RiskWarningRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import com.devpath.domain.learning.service.LearningAutomationRuleCatalog;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SupplementRecommendationQueryServiceTest {

  @Mock private SupplementRecommendationRepository supplementRecommendationRepository;
  @Mock private RecommendationHistoryRepository recommendationHistoryRepository;
  @Mock private RiskWarningRepository riskWarningRepository;
  @Mock private UserRepository userRepository;
  @Mock private LearningAutomationPolicyService learningAutomationPolicyService;
  @InjectMocks private SupplementRecommendationQueryService service;

  @Test
  void filtersByStatusAndSortsPendingRecommendationsByMissingTagCount() {
    SupplementRecommendation approved = recommendation(1L, 5, RecommendationStatus.APPROVED);
    SupplementRecommendation lowPriority = recommendation(2L, 1, RecommendationStatus.PENDING);
    SupplementRecommendation highPriority = recommendation(3L, 3, RecommendationStatus.PENDING);

    when(supplementRecommendationRepository.findAllByUserIdOrderByCreatedAtDesc(7L))
        .thenReturn(List.of(approved, lowPriority, highPriority));
    when(learningAutomationPolicyService.getValue(
            LearningAutomationRuleCatalog.SUPPLEMENT_RECOMMENDATION_PRIORITY,
            "MISSING_TAG_COUNT_DESC"))
        .thenReturn("MISSING_TAG_COUNT_DESC");

    List<SupplementRecommendationResponse> result =
        service.getRecommendations(7L, RecommendationStatus.PENDING);

    assertThat(result)
        .extracting(SupplementRecommendationResponse::getNodeId)
        .containsExactly(3L, 2L);
  }

  @Test
  void rejectsRiskWarningQueryWithoutAuthenticatedUser() {
    assertThatThrownBy(() -> service.getRiskWarnings(null, null, null))
        .isInstanceOf(CustomException.class);
  }

  private SupplementRecommendation recommendation(
      Long nodeId, int missingTagCount, RecommendationStatus status) {
    RoadmapNode node = RoadmapNode.builder().nodeId(nodeId).title("Node " + nodeId).build();
    return SupplementRecommendation.builder()
        .roadmapNode(node)
        .missingTagCount(missingTagCount)
        .coveragePercent(50.0)
        .status(status)
        .build();
  }
}

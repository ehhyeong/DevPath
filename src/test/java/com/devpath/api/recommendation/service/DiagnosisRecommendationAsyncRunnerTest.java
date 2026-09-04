package com.devpath.api.recommendation.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DiagnosisRecommendationAsyncRunnerTest {

  @Mock private DiagnosisRecommendationService diagnosisRecommendationService;
  @Mock private RecommendationStatusService recommendationStatusService;
  @Mock private RecommendationChangeRepository recommendationChangeRepository;
  @Mock private RecommendationChange recommendationChange;

  @Test
  void runAsyncRecordsCreatedRecommendationCount() {
    long userId = 7L;
    long roadmapId = 12L;
    long originalNodeId = 31L;
    when(recommendationChangeRepository
            .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
                userId, roadmapId, RecommendationChangeStatus.SUGGESTED))
        .thenReturn(List.of())
        .thenReturn(List.of(recommendationChange));
    when(recommendationChange.getId()).thenReturn(99L);

    new DiagnosisRecommendationAsyncRunner(
            diagnosisRecommendationService,
            recommendationStatusService,
            recommendationChangeRepository)
        .runAsync(userId, roadmapId, originalNodeId, null);

    verify(recommendationStatusService).markRunning(userId, originalNodeId);
    verify(diagnosisRecommendationService)
        .testRunRecommend(userId, roadmapId, originalNodeId, null);
    verify(recommendationStatusService).markDone(userId, originalNodeId, 1);
  }
}

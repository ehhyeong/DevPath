package com.devpath.api.learner.service;

import com.devpath.api.recommendation.service.RecommendationStatusService;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

// 노드 클리어 직후의 동적 추천 생성을 백그라운드로 분리 실행하고, 진행 상태를 기록한다.
@Slf4j
@Component
@RequiredArgsConstructor
public class DiagnosisRecommendationAsyncRunner {

  private final DiagnosisQuizService diagnosisQuizService;
  private final RecommendationStatusService recommendationStatusService;
  private final RecommendationChangeRepository recommendationChangeRepository;

  @Async
  public void runAsync(Long userId, Long roadmapId, Long originalNodeId) {
    recommendationStatusService.markRunning(userId, originalNodeId);
    try {
      int before = countSuggested(userId, roadmapId);
      diagnosisQuizService.testRunRecommend(userId, roadmapId, originalNodeId);
      int after = countSuggested(userId, roadmapId);
      recommendationStatusService.markDone(userId, originalNodeId, Math.max(0, after - before));
    } catch (Exception e) {
      recommendationStatusService.markFailed(userId, originalNodeId);
      log.warn("[DiagnosisRecommendationAsyncRunner] 비동기 추천 생성 실패: {}", e.getMessage());
    }
  }

  // 해당 로드맵의 대기(SUGGESTED) 추천 수를 센다.
  private int countSuggested(Long userId, Long roadmapId) {
    return recommendationChangeRepository
        .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
            userId, roadmapId, RecommendationChangeStatus.SUGGESTED)
        .size();
  }
}
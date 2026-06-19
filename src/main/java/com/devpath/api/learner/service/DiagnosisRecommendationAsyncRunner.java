package com.devpath.api.learner.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

// 노드 클리어 직후의 동적 추천 생성을 백그라운드로 분리 실행한다.
@Slf4j
@Component
@RequiredArgsConstructor
public class DiagnosisRecommendationAsyncRunner {

  private final DiagnosisQuizService diagnosisQuizService;

  @Async
  public void runAsync(Long userId, Long roadmapId, Long originalNodeId) {
    try {
      diagnosisQuizService.testRunRecommend(userId, roadmapId, originalNodeId);
    } catch (Exception e) {
      log.warn("[DiagnosisRecommendationAsyncRunner] 비동기 추천 생성 실패: {}", e.getMessage());
    }
  }
}

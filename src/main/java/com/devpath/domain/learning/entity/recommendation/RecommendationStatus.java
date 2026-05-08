package com.devpath.domain.learning.entity.recommendation;

public enum RecommendationStatus {

  // 학습자가 아직 수락/거절하지 않은 대기 상태다.
  PENDING,

  // 학습자가 추천을 수락하여 로드맵에 반영된 상태다.
  APPROVED,

  // 학습자가 추천을 거절한 상태다.
  REJECTED
}

package com.devpath.domain.ai.entity;

public enum AiReviewCommentStatus {

  // AI가 생성했고 아직 사용자가 판단하지 않은 코멘트 상태
  PENDING,

  // 사용자가 AI 리뷰 코멘트를 수용한 상태
  ACCEPTED,

  // 사용자가 AI 리뷰 코멘트를 반려한 상태
  REJECTED
}

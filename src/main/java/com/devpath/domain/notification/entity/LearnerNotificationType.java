package com.devpath.domain.notification.entity;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "학습자 알림 타입")
public enum LearnerNotificationType {
  @Schema(description = "스터디 그룹 알림")
  STUDY_GROUP,

  @Schema(description = "학습 플래너 알림")
  PLANNER,

  @Schema(description = "학습 스트릭 알림")
  STREAK,

  @Schema(description = "프로젝트 알림")
  PROJECT,

  @Schema(description = "시스템 알림")
  SYSTEM,

  @Schema(description = "멘토링 질문 답변 등록 알림")
  MENTORING_ANSWER_CREATED,

  @Schema(description = "워크스페이스 질문 답변 등록 알림")
  WORKSPACE_ANSWER_CREATED,

  @Schema(description = "PR 리뷰 등록 알림")
  PR_REVIEW_CREATED,

  @Schema(description = "신청 승인 알림")
  APPLICATION_APPROVED,

  @Schema(description = "신청 거절 알림")
  APPLICATION_REJECTED
}

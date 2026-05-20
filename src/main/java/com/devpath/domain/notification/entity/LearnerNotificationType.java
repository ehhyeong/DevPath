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
  APPLICATION_REJECTED,

  @Schema(description = "Squad 초대 수신 알림")
  SQUAD_INVITED,

  @Schema(description = "Squad 강제 퇴장 알림")
  SQUAD_KICKED,

  @Schema(description = "과제 채점 완료 알림")
  ASSIGNMENT_GRADED,

  @Schema(description = "멘토링 미션 통과 알림")
  MISSION_PASSED,

  @Schema(description = "멘토링 미션 반려 알림")
  MISSION_REJECTED,

  @Schema(description = "AI 로드맵 추천 노드 도착 알림")
  RECOMMENDATION_ARRIVED,

  @Schema(description = "라운지 신청서 수신 알림")
  LOUNGE_APPLICATION_RECEIVED,

  @Schema(description = "내 게시글 댓글 알림")
  COMMUNITY_COMMENTED,

  @Schema(description = "환불 처리 완료 알림")
  REFUND_PROCESSED
}

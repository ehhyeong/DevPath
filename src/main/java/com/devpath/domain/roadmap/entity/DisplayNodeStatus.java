package com.devpath.domain.roadmap.entity;

/** API 응답 전용 노드 상태 enum. DB 저장용 NodeStatus와 분리하여 LOCKED/PENDING을 동적으로 표현한다. */
public enum DisplayNodeStatus {
  PENDING, // 잠금 해제 + 미시작
  IN_PROGRESS, // 학습 중
  COMPLETED, // 완료
  LOCKED // 선행 노드 미완료로 잠김 (DB 저장 안 함, 조회 시 동적 계산)
}

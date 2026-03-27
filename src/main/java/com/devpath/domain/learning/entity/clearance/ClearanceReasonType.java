package com.devpath.domain.learning.entity.clearance;

// 노드 클리어 판정 근거 유형을 나타낸다.
public enum ClearanceReasonType {

    // 레슨 완강 여부 근거다.
    LESSON_COMPLETION,

    // 필수 태그 충족 여부 근거다.
    REQUIRED_TAGS,

    // 부족 태그 목록 근거다.
    MISSING_TAGS,

    // 퀴즈 통과 여부 근거다.
    QUIZ_PASS,

    // 과제 통과 여부 근거다.
    ASSIGNMENT_PASS,

    // Proof 발급 가능 여부 근거다.
    PROOF_ELIGIBLE
}

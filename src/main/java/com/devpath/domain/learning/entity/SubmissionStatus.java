package com.devpath.domain.learning.entity;

// 과제 제출 상태를 precheck부터 채점 완료까지 추적하기 위한 enum이다.
public enum SubmissionStatus {

    // 아직 precheck를 수행하지 않은 초기 상태다.
    PRECHECK_PENDING,

    // precheck를 수행했지만 조건을 만족하지 못한 상태다.
    PRECHECK_FAILED,

    // precheck를 통과했지만 아직 최종 제출 전인 상태다.
    PRECHECK_PASSED,

    // 학습자가 실제 제출을 완료한 상태다.
    SUBMITTED,

    // 강사가 현재 채점 중인 상태다.
    GRADING,

    // 채점과 피드백 작성이 완료된 상태다.
    GRADED,

    // 강사가 보완 후 재제출을 요구하며 반환한 상태다.
    RETURNED
}

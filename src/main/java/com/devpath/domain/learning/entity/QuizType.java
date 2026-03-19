package com.devpath.domain.learning.entity;

// 퀴즈가 어떤 방식으로 생성되었는지를 구분하기 위한 enum이다.
public enum QuizType {

    // 강사가 직접 만든 일반 수동 퀴즈다.
    MANUAL,

    // 주제나 키워드 기반으로 AI가 생성한 퀴즈다.
    AI_TOPIC,

    // 영상이나 특정 구간을 근거로 AI가 생성한 퀴즈다.
    AI_VIDEO
}

package com.devpath.domain.learning.entity;

// 개별 문항의 유형을 구분하기 위한 enum이다.
public enum QuestionType {

    // 보기 중 하나 이상을 선택하는 객관식 문항이다.
    MULTIPLE_CHOICE,

    // 참/거짓 또는 O/X 형식의 문항이다.
    TRUE_FALSE,

    // 사용자가 직접 텍스트를 입력하는 주관식 문항이다.
    SHORT_ANSWER
}

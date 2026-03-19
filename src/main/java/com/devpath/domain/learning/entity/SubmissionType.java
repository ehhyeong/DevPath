package com.devpath.domain.learning.entity;

// 과제가 어떤 방식으로 제출되는지를 구분하기 위한 enum이다.
public enum SubmissionType {

    // 텍스트 본문만 제출하는 과제다.
    TEXT,

    // 파일만 제출하는 과제다.
    FILE,

    // 외부 URL만 제출하는 과제다.
    URL,

    // 텍스트, 파일, URL 등을 함께 허용하는 복합 과제다.
    MULTIPLE
}

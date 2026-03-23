package com.devpath.domain.qna.entity;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "질문 템플릿 타입")
public enum QuestionTemplateType {

    @Schema(description = "오류 재현/디버깅 질문")
    DEBUGGING,

    @Schema(description = "구현 방식 질문")
    IMPLEMENTATION,

    @Schema(description = "코드 리뷰 질문")
    CODE_REVIEW,

    @Schema(description = "커리어/취업 질문")
    CAREER,

    @Schema(description = "학습/개념 질문")
    STUDY,

    @Schema(description = "프로젝트 구조/협업 질문")
    PROJECT
}

package com.devpath.domain.qna.entity;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "질문 난이도")
public enum QuestionDifficulty {

    @Schema(description = "기초")
    EASY,

    @Schema(description = "중간")
    MEDIUM,

    @Schema(description = "심화")
    HARD
}

package com.devpath.domain.qna.entity;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "질문 소속 범위")
public enum QuestionScope {

  @Schema(description = "강의 Q&A")
  COURSE,

  @Schema(description = "멘토링 Q&A")
  MENTORING,

  @Schema(description = "워크스페이스 Q&A")
  WORKSPACE
}

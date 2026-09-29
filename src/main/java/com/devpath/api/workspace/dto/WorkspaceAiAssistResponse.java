package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Schema(description = "스쿼드 워크스페이스 AI 비서 답변")
public class WorkspaceAiAssistResponse {

  @Schema(description = "팀원에게 보여줄 AI 답변", example = "이번 주 마감 작업은 2건입니다.")
  private String answer;

  public static WorkspaceAiAssistResponse of(String answer) {
    return WorkspaceAiAssistResponse.builder().answer(answer).build();
  }
}
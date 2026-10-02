package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Schema(description = "워크스페이스 AI 변경 제안 실행 결과")
public class WorkspaceAiActionExecuteResponse {

  @Schema(description = "실행된 변경 요약 (실행 순서대로)")
  private List<String> results;

  public static WorkspaceAiActionExecuteResponse of(List<String> results) {
    return WorkspaceAiActionExecuteResponse.builder().results(results).build();
  }
}
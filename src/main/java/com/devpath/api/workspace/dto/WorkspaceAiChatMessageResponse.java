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
@Schema(description = "워크스페이스 AI 에이전트 대화 메시지")
public class WorkspaceAiChatMessageResponse {

  @Schema(description = "메시지 ID", example = "1")
  private Long id;

  @Schema(description = "발화 주체", example = "USER", allowableValues = "USER,ASSISTANT")
  private String role;

  @Schema(description = "질문했거나 변경을 실행한 팀원 ID", example = "30")
  private Long authorId;

  @Schema(description = "질문했거나 변경을 실행한 팀원 이름", example = "이학습")
  private String authorName;

  @Schema(description = "메시지 내용")
  private String content;

  @Schema(description = "확인 후 실행할 변경 제안. 제안이 없으면 빈 배열이다.")
  private List<WorkspaceAiAction> actions;

  @Schema(
      description = "변경 제안 실행 상태. 제안이 없으면 null",
      example = "PENDING",
      allowableValues = "PENDING,EXECUTED")
  private String actionStatus;
}

package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "워크스페이스 AI 변경 제안 실행 요청")
public class WorkspaceAiActionExecuteRequest {

  @Schema(description = "실행할 변경 제안 목록 (AI 답변으로 받은 그대로)")
  @NotEmpty(message = "실행할 변경이 없습니다.")
  @Size(max = 10, message = "한 번에 10건까지 실행할 수 있습니다.")
  @Valid
  private List<WorkspaceAiAction> actions;
}
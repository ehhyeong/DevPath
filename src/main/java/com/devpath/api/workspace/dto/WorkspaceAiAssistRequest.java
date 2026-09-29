package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "스쿼드 워크스페이스 AI 비서 질문 요청")
public class WorkspaceAiAssistRequest {

  @Schema(description = "팀원이 입력한 자연어 질문", example = "이번 주 마감인 작업이랑 담당자 알려줘")
  @NotBlank(message = "질문은 필수입니다.")
  @Size(max = 500, message = "질문은 500자 이하여야 합니다.")
  private String question;

  @Schema(description = "직전 대화 이력. 오래된 것부터 정렬한다.")
  @Size(max = 10, message = "대화 이력은 10개 이하여야 합니다.")
  @Valid
  private List<Message> history;

  @Getter
  @NoArgsConstructor
  @Schema(name = "WorkspaceAiAssistMessage", description = "대화 이력 한 건")
  public static class Message {

    @Schema(description = "발화 주체", example = "user", allowableValues = "user,assistant")
    @Size(max = 20, message = "role은 20자 이하여야 합니다.")
    private String role;

    @Schema(description = "발화 내용")
    @Size(max = 2000, message = "대화 내용은 2000자 이하여야 합니다.")
    private String text;
  }
}
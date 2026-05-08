package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateMeetingNoteRequest {

  @NotBlank
  @Schema(description = "회의록 제목", example = "2026-06-02 스프린트 킥오프 회의")
  private String title;

  @Schema(description = "회의록 내용 (Markdown 형식 권장)", example = "## 참석자\n- 김하늘\n\n## 논의 내용\n- ...")
  private String content;
}

package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class TilRequest {

  @Getter
  @NoArgsConstructor
  @Schema(description = "TIL 초안 저장 요청 DTO")
  public static class Create {

    @NotBlank(message = "TIL 제목은 필수입니다.")
    @Schema(description = "TIL 제목", example = "Spring Security 학습 정리")
    private String title;

    @NotBlank(message = "TIL 본문은 필수입니다.")
    @Schema(description = "TIL 본문", example = "# Spring Security\n인증과 인가를 학습했다.")
    private String content;

    @Schema(description = "연결할 레슨 ID", example = "10")
    private Long lessonId;
  }

  @Getter
  @NoArgsConstructor
  @Schema(description = "TIL 수정 요청 DTO")
  public static class Update {

    @NotBlank(message = "TIL 제목은 필수입니다.")
    @Schema(description = "TIL 제목", example = "Spring Security 학습 정리")
    private String title;

    @NotBlank(message = "TIL 본문은 필수입니다.")
    @Schema(description = "TIL 본문", example = "# Spring Security\n인증과 인가를 학습했다.")
    private String content;
  }

  @Getter
  @NoArgsConstructor
  @Schema(description = "노트 기반 TIL 변환 요청 DTO")
  public static class ConvertFromNotes {

    @NotEmpty(message = "변환할 노트 ID 목록은 필수입니다.")
    @Schema(description = "변환할 노트 ID 목록", example = "[1,2,3]")
    private List<Long> noteIds;

    @NotBlank(message = "TIL 제목은 필수입니다.")
    @Schema(description = "자동 생성할 TIL 제목", example = "Spring Security 노트 기반 TIL")
    private String title;

    @Schema(description = "변환 기준 레슨 ID", example = "10")
    private Long lessonId;
  }
}

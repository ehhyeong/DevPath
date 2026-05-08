package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class TimestampNoteRequest {

  @Getter
  @NoArgsConstructor
  @Schema(description = "타임스탬프 노트 생성 요청 DTO")
  public static class Create {

    @Min(value = 0, message = "타임스탬프 초는 0 이상이어야 합니다.")
    @Schema(description = "타임스탬프 초", example = "125")
    private Integer timestampSecond;

    // 숫자 초를 직접 넘기지 않을 때 사용할 문자열 입력값이다.
    @Schema(description = "타임스탬프 문자열", example = "02:05")
    private String timestampText;

    @NotBlank(message = "노트 내용은 필수입니다.")
    @Schema(description = "노트 내용", example = "Spring Security 인증 흐름 다시 보기")
    private String content;

    // 숫자 초와 문자열 타임스탬프 중 하나는 반드시 들어와야 한다.
    @AssertTrue(message = "timestampSecond 또는 timestampText 중 하나는 필수입니다.")
    public boolean hasTimestampValue() {
      return timestampSecond != null || (timestampText != null && !timestampText.isBlank());
    }
  }

  @Getter
  @NoArgsConstructor
  @Schema(description = "타임스탬프 노트 수정 요청 DTO")
  public static class Update {

    @Min(value = 0, message = "타임스탬프 초는 0 이상이어야 합니다.")
    @Schema(description = "타임스탬프 초", example = "140")
    private Integer timestampSecond;

    // 숫자 초를 직접 넘기지 않을 때 사용할 문자열 입력값이다.
    @Schema(description = "타임스탬프 문자열", example = "02:20")
    private String timestampText;

    @NotBlank(message = "노트 내용은 필수입니다.")
    @Schema(description = "노트 내용", example = "여기서 필터 체인 동작 확인")
    private String content;

    // 숫자 초와 문자열 타임스탬프 중 하나는 반드시 들어와야 한다.
    @AssertTrue(message = "timestampSecond 또는 timestampText 중 하나는 필수입니다.")
    public boolean hasTimestampValue() {
      return timestampSecond != null || (timestampText != null && !timestampText.isBlank());
    }
  }
}

package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class OcrRequest {

  /** 캔버스 캡처 이미지를 base64로 직접 전송하는 경량 OCR 요청. lessonId 불필요, DB 저장 없이 Python OCR 서버에 즉시 위임합니다. */
  @Getter
  @NoArgsConstructor
  @Schema(description = "Base64 이미지 직접 OCR 요청 DTO")
  public static class ExtractBase64 {

    @NotBlank(message = "이미지 데이터는 필수입니다.")
    @Schema(description = "base64 인코딩된 이미지 (data:image/... 프리픽스 제외)", example = "iVBORw0KGgo...")
    private String imageBase64;
  }

  @Getter
  @NoArgsConstructor
  @Schema(description = "OCR 추출 요청 DTO")
  public static class Extract {

    @NotNull(message = "프레임 타임스탬프는 필수입니다.")
    @Min(value = 0, message = "프레임 타임스탬프는 0 이상이어야 합니다.")
    @Schema(description = "프레임 타임스탬프(초)", example = "120")
    private Integer frameTimestampSecond;

    @NotBlank(message = "원본 이미지 URL은 필수입니다.")
    @Schema(
        description = "OCR 대상 이미지 URL",
        example = "https://cdn.devpath.ai/frames/lesson-10-120.png")
    private String sourceImageUrl;

    @Schema(description = "OCR 원문 힌트", example = "Spring Security는 인증과 인가를 담당한다.")
    private String sourceTextHint;
  }
}

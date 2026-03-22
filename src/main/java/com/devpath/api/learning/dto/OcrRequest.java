package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Learning request DTOs stay grouped in a single wrapper class.
public class OcrRequest {

    @Getter
    @NoArgsConstructor
    @Schema(description = "OCR 추출 요청 DTO")
    public static class Extract {

        @NotNull(message = "프레임 타임스탬프는 필수입니다.")
        @Min(value = 0, message = "프레임 타임스탬프는 0 이상이어야 합니다.")
        @Schema(description = "프레임 타임스탬프(초)", example = "120")
        private Integer frameTimestampSecond;

        @NotBlank(message = "원본 이미지 URL은 필수입니다.")
        @Schema(description = "OCR 대상 이미지 URL", example = "https://cdn.devpath.ai/frames/lesson-10-120.png")
        private String sourceImageUrl;

        @Schema(description = "OCR 원문 힌트", example = "Spring Security는 인증과 인가를 담당한다.")
        private String sourceTextHint;
    }
}

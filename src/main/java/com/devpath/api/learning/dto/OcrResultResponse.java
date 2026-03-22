package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.ocr.OcrResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "OCR 결과 단건 응답 DTO")
public class OcrResultResponse {

    @Schema(description = "OCR 결과 ID", example = "1")
    private Long ocrId;

    @Schema(description = "강의 ID", example = "10")
    private Long lessonId;

    @Schema(description = "프레임 타임스탬프(초)", example = "120")
    private Integer frameTimestampSecond;

    // 한글 주석: OCR 검색/상세에서 같은 필드를 재사용할 수 있게 추출 텍스트를 명시한다.
    @Schema(description = "추출된 텍스트", example = "Spring Security는 인증과 인가를 담당합니다.")
    private String extractedText;

    @Schema(description = "OCR 신뢰도", example = "0.97")
    private Double confidence;

    @Schema(description = "생성 시각", example = "2026-03-23T12:30:00")
    private LocalDateTime createdAt;

    public static OcrResultResponse from(OcrResult result) {
        return OcrResultResponse.builder()
                .ocrId(result.getId())
                .lessonId(result.getLesson().getLessonId())
                .frameTimestampSecond(result.getFrameTimestampSecond())
                .extractedText(result.getExtractedText())
                .confidence(result.getConfidence())
                .createdAt(result.getCreatedAt())
                .build();
    }
}

package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.ocr.OcrResult;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OcrResultResponse {

    private Long ocrId;
    private Long lessonId;
    private Integer frameTimestampSecond;
    private String extractedText;
    private Double confidence;
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

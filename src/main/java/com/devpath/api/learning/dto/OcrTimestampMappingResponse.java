package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.ocr.OcrResult;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OcrTimestampMappingResponse {

    private Long ocrId;
    private Long lessonId;

    // 프레임 타임스탬프 (초 단위)
    private Integer frameTimestampSecond;

    // 타임스탬프를 mm:ss 형식으로 변환한 값
    private String timestampFormatted;

    // 해당 타임스탬프에서 추출된 텍스트
    private String extractedText;

    // 키워드와 일치하는 구간 여부
    private Boolean matched;

    public static OcrTimestampMappingResponse from(OcrResult result, String keyword) {
        int sec = result.getFrameTimestampSecond();
        boolean matched = keyword != null
                && result.getExtractedText() != null
                && result.getExtractedText().toLowerCase().contains(keyword.toLowerCase());

        return OcrTimestampMappingResponse.builder()
                .ocrId(result.getId())
                .lessonId(result.getLesson().getLessonId())
                .frameTimestampSecond(sec)
                .timestampFormatted(String.format("%02d:%02d", sec / 60, sec % 60))
                .extractedText(result.getExtractedText())
                .matched(matched)
                .build();
    }
}

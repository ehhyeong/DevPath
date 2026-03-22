package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.ocr.OcrResult;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "OCR 텍스트-타임스탬프 매핑 응답 DTO")
public class OcrTimestampMappingResponse {

    @Schema(description = "OCR 결과 ID", example = "1")
    private Long ocrId;

    @Schema(description = "강의 ID", example = "10")
    private Long lessonId;

    @Schema(description = "프레임 타임스탬프(초)", example = "120")
    private Integer frameTimestampSecond;

    // 한글 주석: 노트 이동 UI에서 바로 쓸 수 있도록 표시용 포맷 문자열도 함께 내려준다.
    @Schema(description = "mm:ss 형식의 표시용 타임스탬프", example = "02:00")
    private String timestampFormatted;

    @Schema(description = "해당 시점에서 추출된 텍스트", example = "Spring Security는 인증과 인가를 담당합니다.")
    private String extractedText;

    @Schema(description = "검색어 일치 여부", example = "true")
    private Boolean matched;

    public static OcrTimestampMappingResponse from(OcrResult result, String keyword) {
        int second = result.getFrameTimestampSecond();
        boolean matched = keyword != null
                && result.getExtractedText() != null
                && result.getExtractedText().toLowerCase().contains(keyword.toLowerCase());

        return OcrTimestampMappingResponse.builder()
                .ocrId(result.getId())
                .lessonId(result.getLesson().getLessonId())
                .frameTimestampSecond(second)
                .timestampFormatted(String.format("%02d:%02d", second / 60, second % 60))
                .extractedText(result.getExtractedText())
                .matched(matched)
                .build();
    }
}

package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.ocr.OcrResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

// Response DTOs follow the same nested-class style as the existing learning APIs.
public class OcrResponse {

    @Getter
    @Builder
    @Schema(description = "OCR 단건 응답 DTO")
    public static class Detail {

        @Schema(description = "OCR 결과 ID", example = "1")
        private Long ocrId;

        @Schema(description = "레슨 ID", example = "10")
        private Long lessonId;

        @Schema(description = "사용자 ID", example = "1")
        private Long userId;

        @Schema(description = "프레임 타임스탬프(초)", example = "120")
        private Integer frameTimestampSecond;

        @Schema(description = "원본 이미지 URL", example = "https://cdn.devpath.ai/frames/lesson-10-120.png")
        private String sourceImageUrl;

        @Schema(description = "OCR 상태", example = "COMPLETED")
        private String status;

        @Schema(description = "추출 텍스트", example = "Spring Security는 인증과 인가를 담당한다.")
        private String extractedText;

        @Schema(description = "타임스탬프 매핑", example = "[{\"second\":120,\"text\":\"Spring Security는 인증과 인가를 담당한다.\"}]")
        private String timestampMappings;

        @Schema(description = "OCR 신뢰도", example = "0.97")
        private Double confidence;

        @Schema(description = "생성 시각", example = "2026-03-23T10:30:00")
        private LocalDateTime createdAt;

        public static Detail from(OcrResult ocrResult) {
            return Detail.builder()
                    .ocrId(ocrResult.getId())
                    .lessonId(ocrResult.getLesson().getLessonId())
                    .userId(ocrResult.getUser().getId())
                    .frameTimestampSecond(ocrResult.getFrameTimestampSecond())
                    .sourceImageUrl(ocrResult.getSourceImageUrl())
                    .status(ocrResult.getStatus())
                    .extractedText(ocrResult.getExtractedText())
                    .timestampMappings(ocrResult.getTimestampMappings())
                    .confidence(ocrResult.getConfidence())
                    .createdAt(ocrResult.getCreatedAt())
                    .build();
        }
    }

    @Getter
    @Builder
    @Schema(description = "OCR 검색 결과 응답 DTO")
    public static class SearchResult {

        @Schema(description = "레슨 ID", example = "10")
        private Long lessonId;

        @Schema(description = "검색어", example = "security")
        private String keyword;

        @Schema(description = "총 검색 결과 수", example = "2")
        private Integer totalCount;

        @Schema(description = "검색 결과 목록")
        private List<SearchItem> results;

        @Getter
        @Builder
        @Schema(description = "개별 OCR 검색 결과 항목 DTO")
        public static class SearchItem {

            @Schema(description = "OCR 결과 ID", example = "1")
            private Long ocrId;

            @Schema(description = "프레임 타임스탬프(초)", example = "120")
            private Integer frameTimestampSecond;

            @Schema(description = "추출 텍스트", example = "Spring Security는 인증과 인가를 담당한다.")
            private String extractedText;

            @Schema(description = "OCR 신뢰도", example = "0.97")
            private Double confidence;

            public static SearchItem from(OcrResult ocrResult) {
                return SearchItem.builder()
                        .ocrId(ocrResult.getId())
                        .frameTimestampSecond(ocrResult.getFrameTimestampSecond())
                        .extractedText(ocrResult.getExtractedText())
                        .confidence(ocrResult.getConfidence())
                        .build();
            }
        }

        public static SearchResult of(Long lessonId, String keyword, List<OcrResult> ocrResults) {
            List<SearchItem> items = ocrResults == null
                    ? new ArrayList<>()
                    : ocrResults.stream().map(SearchItem::from).toList();

            return SearchResult.builder()
                    .lessonId(lessonId)
                    .keyword(keyword)
                    .totalCount(items.size())
                    .results(items)
                    .build();
        }
    }

    @Getter
    @Builder
    @Schema(description = "OCR 텍스트-타임스탬프 매핑 조회 응답 DTO")
    public static class MappingResult {

        @Schema(description = "레슨 ID", example = "10")
        private Long lessonId;

        @Schema(description = "매핑 개수", example = "3")
        private Integer totalCount;

        @Schema(description = "매핑 목록")
        private List<MappingItem> mappings;

        @Getter
        @Builder
        @Schema(description = "개별 OCR 매핑 항목 DTO")
        public static class MappingItem {

            @Schema(description = "OCR 결과 ID", example = "1")
            private Long ocrId;

            @Schema(description = "프레임 타임스탬프(초)", example = "120")
            private Integer frameTimestampSecond;

            @Schema(description = "추출 텍스트", example = "Spring Security는 인증과 인가를 담당한다.")
            private String extractedText;

            @Schema(description = "타임스탬프 매핑", example = "[{\"second\":120,\"text\":\"Spring Security는 인증과 인가를 담당한다.\"}]")
            private String timestampMappings;

            public static MappingItem from(OcrResult ocrResult) {
                return MappingItem.builder()
                        .ocrId(ocrResult.getId())
                        .frameTimestampSecond(ocrResult.getFrameTimestampSecond())
                        .extractedText(ocrResult.getExtractedText())
                        .timestampMappings(ocrResult.getTimestampMappings())
                        .build();
            }
        }

        public static MappingResult of(Long lessonId, List<OcrResult> ocrResults) {
            List<MappingItem> items = ocrResults == null
                    ? new ArrayList<>()
                    : ocrResults.stream().map(MappingItem::from).toList();

            return MappingResult.builder()
                    .lessonId(lessonId)
                    .totalCount(items.size())
                    .mappings(items)
                    .build();
        }
    }
}

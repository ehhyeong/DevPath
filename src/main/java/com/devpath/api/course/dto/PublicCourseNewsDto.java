package com.devpath.api.course.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// 공개 강의 새소식 탭 응답 DTO를 제공한다.
public class PublicCourseNewsDto {

    // 새소식 탭 목록 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "공개 강의 새소식 탭 응답 DTO")
    public static class NewsItemResponse {

        @Schema(description = "공지 ID", example = "11")
        private Long announcementId;

        @Schema(description = "공지 타입", example = "EVENT")
        private String type;

        @Schema(description = "공지 제목", example = "오프라인 특강 이벤트 안내")
        private String title;

        @Schema(description = "공지 내용", example = "Spring Security 오프라인 특강 이벤트가 열립니다.")
        private String content;

        @Schema(description = "상단 고정 여부", example = "true")
        private Boolean pinned;

        @Schema(description = "노출 순서", example = "0")
        private Integer displayOrder;

        @Schema(description = "게시 시각", example = "2026-03-16T10:00:00")
        private LocalDateTime publishedAt;

        @Schema(description = "노출 시작 시각", example = "2026-03-16T10:00:00")
        private LocalDateTime exposureStartAt;

        @Schema(description = "노출 종료 시각", example = "2026-03-30T23:59:59")
        private LocalDateTime exposureEndAt;

        @Schema(description = "이벤트 배너 문구", example = "3월 한정 오프라인 특강 모집")
        private String eventBannerText;

        @Schema(description = "이벤트 링크", example = "https://devpath.com/events/security-special")
        private String eventLink;

        @Schema(description = "생성 시각", example = "2026-03-16T09:30:00")
        private LocalDateTime createdAt;
    }
}

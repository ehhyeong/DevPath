package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// 강사용 공지/새소식 CRUD DTO를 제공한다.
public class InstructorAnnouncementDto {

    // 공지 생성 요청 DTO다.
    @Getter
    @Schema(description = "강의 공지 생성 요청 DTO")
    public static class CreateAnnouncementRequest {

        @jakarta.validation.constraints.NotBlank(message = "공지 타입은 필수입니다.")
        @Schema(
                description = "공지 타입",
                example = "event",
                allowableValues = {"normal", "event"}
        )
        private String type;

        @jakarta.validation.constraints.NotBlank(message = "공지 제목은 필수입니다.")
        @Schema(description = "공지 제목", example = "오프라인 특강 이벤트 안내")
        private String title;

        @jakarta.validation.constraints.NotBlank(message = "공지 내용은 필수입니다.")
        @Schema(description = "공지 내용", example = "Spring Security 오프라인 특강 이벤트가 열립니다.")
        private String content;

        @NotNull(message = "고정 여부는 필수입니다.")
        @Schema(description = "상단 고정 여부", example = "true")
        private Boolean pinned;

        @NotNull(message = "노출 순서는 필수입니다.")
        @PositiveOrZero(message = "노출 순서는 0 이상이어야 합니다.")
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
    }

    // 공지 수정 요청 DTO다.
    @Getter
    @Schema(description = "강의 공지 수정 요청 DTO")
    public static class UpdateAnnouncementRequest {

        @jakarta.validation.constraints.NotBlank(message = "공지 타입은 필수입니다.")
        @Schema(
                description = "공지 타입",
                example = "normal",
                allowableValues = {"normal", "event"}
        )
        private String type;

        @jakarta.validation.constraints.NotBlank(message = "공지 제목은 필수입니다.")
        @Schema(description = "공지 제목", example = "강의 자료 업데이트 안내")
        private String title;

        @jakarta.validation.constraints.NotBlank(message = "공지 내용은 필수입니다.")
        @Schema(description = "공지 내용", example = "실습 자료가 최신 버전 기준으로 수정되었습니다.")
        private String content;

        @NotNull(message = "고정 여부는 필수입니다.")
        @Schema(description = "상단 고정 여부", example = "false")
        private Boolean pinned;

        @NotNull(message = "노출 순서는 필수입니다.")
        @PositiveOrZero(message = "노출 순서는 0 이상이어야 합니다.")
        @Schema(description = "노출 순서", example = "1")
        private Integer displayOrder;

        @Schema(description = "게시 시각", example = "2026-03-16T10:00:00")
        private LocalDateTime publishedAt;

        @Schema(description = "노출 시작 시각", example = "2026-03-16T10:00:00")
        private LocalDateTime exposureStartAt;

        @Schema(description = "노출 종료 시각", example = "2026-03-31T23:59:59")
        private LocalDateTime exposureEndAt;

        @Schema(description = "이벤트 배너 문구", example = "3월 한정 오프라인 특강 모집")
        private String eventBannerText;

        @Schema(description = "이벤트 링크", example = "https://devpath.com/events/security-special")
        private String eventLink;
    }

    // 공지 고정 여부 변경 요청 DTO다.
    @Getter
    @Schema(description = "공지 고정 여부 변경 요청 DTO")
    public static class UpdateAnnouncementPinRequest {

        @NotNull(message = "고정 여부는 필수입니다.")
        @Schema(description = "상단 고정 여부", example = "true")
        private Boolean pinned;
    }

    // 공지 노출 순서 일괄 변경 요청 DTO다.
    @Getter
    @Schema(description = "공지 노출 순서 일괄 변경 요청 DTO")
    public static class UpdateAnnouncementOrderRequest {

        @Valid
        @NotEmpty(message = "공지 순서 목록은 최소 1개 이상이어야 합니다.")
        @Schema(description = "공지 순서 변경 목록")
        private List<AnnouncementOrderItem> announcementOrders;
    }

    // 공지 노출 순서 변경 항목 DTO다.
    @Getter
    @Schema(description = "공지 노출 순서 변경 항목 DTO")
    public static class AnnouncementOrderItem {

        @NotNull(message = "공지 ID는 필수입니다.")
        @Schema(description = "공지 ID", example = "11")
        private Long announcementId;

        @NotNull(message = "노출 순서는 필수입니다.")
        @PositiveOrZero(message = "노출 순서는 0 이상이어야 합니다.")
        @Schema(description = "변경할 노출 순서", example = "0")
        private Integer displayOrder;
    }

    // 공지 목록 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "강의 공지 목록 응답 DTO")
    public static class AnnouncementSummaryResponse {

        @Schema(description = "공지 ID", example = "11")
        private Long announcementId;

        @Schema(description = "강의 ID", example = "3")
        private Long courseId;

        @Schema(description = "공지 타입", example = "EVENT")
        private String type;

        @Schema(description = "공지 제목", example = "오프라인 특강 이벤트 안내")
        private String title;

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
    }

    // 공지 상세 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "강의 공지 상세 응답 DTO")
    public static class AnnouncementDetailResponse {

        @Schema(description = "공지 ID", example = "11")
        private Long announcementId;

        @Schema(description = "강의 ID", example = "3")
        private Long courseId;

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

        @Schema(description = "수정 시각", example = "2026-03-16T09:40:00")
        private LocalDateTime updatedAt;
    }
}

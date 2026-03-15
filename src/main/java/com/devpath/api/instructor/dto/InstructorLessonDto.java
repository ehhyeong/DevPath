package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

// DTOs for instructor lesson create/update/order/prerequisite APIs.
public class InstructorLessonDto {

  @Getter
  @Schema(description = "레슨 생성 요청 DTO")
  public static class CreateLessonRequest {

    @NotBlank(message = "레슨 제목은 필수입니다.")
    @Schema(description = "레슨 제목", example = "JWT 인증 필터 구현")
    private String title;

    @Schema(description = "레슨 설명", example = "JWT 인증 필터를 구현하고 인증 흐름을 확인합니다.")
    private String description;

    @NotBlank(message = "레슨 유형은 필수입니다.")
    @Schema(
        description = "레슨 유형",
        example = "video",
        allowableValues = {"video", "reading", "coding"})
    private String lessonType;

    @Schema(description = "영상 ID", example = "video-asset-001")
    private String videoId;

    @Schema(description = "영상 URL", example = "https://cdn.devpath.com/lessons/video-1.mp4")
    private String videoUrl;

    @Schema(description = "영상 제공자", example = "r2")
    private String videoProvider;

    @Schema(
        description = "썸네일 URL",
        example = "https://cdn.devpath.com/lessons/thumbnails/video-1.png")
    private String thumbnailUrl;

    @PositiveOrZero(message = "레슨 길이는 0 이상이어야 합니다.")
    @Schema(description = "레슨 길이(초)", example = "780")
    private Integer durationSeconds;

    @NotNull(message = "레슨 순서는 필수입니다.")
    @PositiveOrZero(message = "레슨 순서는 0 이상이어야 합니다.")
    @Schema(description = "레슨 순서", example = "1")
    private Integer orderIndex;

    @NotNull(message = "미리보기 여부는 필수입니다.")
    @Schema(description = "미리보기 가능 여부", example = "false")
    private Boolean isPreview;

    @NotNull(message = "레슨 공개 여부는 필수입니다.")
    @Schema(description = "레슨 공개 여부", example = "true")
    private Boolean isPublished;
  }

  @Getter
  @Schema(description = "레슨 수정 요청 DTO")
  public static class UpdateLessonRequest {

    @NotBlank(message = "레슨 제목은 필수입니다.")
    @Schema(description = "레슨 제목", example = "JWT 인증 필터 심화 구현")
    private String title;

    @Schema(
        description = "레슨 설명",
        example = "JWT 인증 필터와 SecurityContext 저장 흐름을 심화 학습합니다.")
    private String description;

    @NotBlank(message = "레슨 유형은 필수입니다.")
    @Schema(
        description = "레슨 유형",
        example = "video",
        allowableValues = {"video", "reading", "coding"})
    private String lessonType;

    @Schema(description = "영상 ID", example = "video-asset-002")
    private String videoId;

    @Schema(description = "영상 URL", example = "https://cdn.devpath.com/lessons/video-2.mp4")
    private String videoUrl;

    @Schema(description = "영상 제공자", example = "r2")
    private String videoProvider;

    @Schema(
        description = "썸네일 URL",
        example = "https://cdn.devpath.com/lessons/thumbnails/video-2.png")
    private String thumbnailUrl;

    @PositiveOrZero(message = "레슨 길이는 0 이상이어야 합니다.")
    @Schema(description = "레슨 길이(초)", example = "840")
    private Integer durationSeconds;

    @NotNull(message = "미리보기 여부는 필수입니다.")
    @Schema(description = "미리보기 가능 여부", example = "true")
    private Boolean isPreview;

    @NotNull(message = "레슨 공개 여부는 필수입니다.")
    @Schema(description = "레슨 공개 여부", example = "true")
    private Boolean isPublished;
  }

  @Getter
  @Schema(description = "레슨 순서 일괄 변경 요청 DTO")
  public static class UpdateLessonOrderRequest {

    @NotNull(message = "섹션 ID는 필수입니다.")
    @Schema(description = "대상 섹션 ID", example = "10")
    private Long sectionId;

    @Valid
    @NotEmpty(message = "레슨 순서 목록은 최소 1개 이상이어야 합니다.")
    @Schema(description = "레슨 순서 변경 목록")
    private List<LessonOrderItem> lessonOrders;
  }

  @Getter
  @Schema(description = "레슨 순서 변경 항목 DTO")
  public static class LessonOrderItem {

    @NotNull(message = "레슨 ID는 필수입니다.")
    @Schema(description = "레슨 ID", example = "101")
    private Long lessonId;

    @NotNull(message = "레슨 순서는 필수입니다.")
    @PositiveOrZero(message = "레슨 순서는 0 이상이어야 합니다.")
    @Schema(description = "변경할 순서", example = "1")
    private Integer orderIndex;
  }

  // Replaces the entire prerequisite set for a lesson in one request.
  @Getter
  @Schema(description = "레슨 선행 조건 전체 교체 요청 DTO")
  public static class UpdateLessonPrerequisitesRequest {

    @NotNull(message = "선행 조건 레슨 ID 목록은 필수입니다.")
    @Size(max = 20, message = "선행 조건은 최대 20개까지 설정할 수 있습니다.")
    @Schema(description = "선행 조건 레슨 ID 목록. 빈 배열이면 전체 해제", example = "[11, 12, 13]")
    private List<Long> prerequisiteLessonIds;
  }

  @Getter
  @Builder
  @Schema(description = "레슨 선행 조건 전체 교체 응답 DTO")
  public static class UpdateLessonPrerequisitesResponse {

    @Schema(description = "대상 레슨 ID", example = "21")
    private Long lessonId;

    @Schema(description = "저장된 선행 조건 레슨 ID 목록", example = "[11, 12, 13]")
    private List<Long> prerequisiteLessonIds;
  }
}

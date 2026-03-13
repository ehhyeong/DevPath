package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;

// 강사용 강의 섹션 관리 DTO를 제공한다.
public class InstructorSectionDto {

  // 섹션 생성 요청 DTO다.
  @Getter
  @Schema(description = "섹션 생성 요청 DTO")
  public static class CreateSectionRequest {

    @NotBlank(message = "섹션 제목은 필수입니다.")
    @Schema(description = "섹션 제목", example = "Section 1. Spring Security 기본기")
    private String title;

    @Schema(description = "섹션 설명", example = "인증과 인가, 필터 체인을 이해하기 위한 기본 섹션입니다.")
    private String description;

    @NotNull(message = "섹션 순서는 필수입니다.")
    @PositiveOrZero(message = "섹션 순서는 0 이상이어야 합니다.")
    @Schema(description = "섹션 순서", example = "1")
    private Integer orderIndex;

    @NotNull(message = "섹션 공개 여부는 필수입니다.")
    @Schema(description = "섹션 공개 여부", example = "true")
    private Boolean isPublished;
  }

  // 섹션 수정 요청 DTO다.
  @Getter
  @Schema(description = "섹션 수정 요청 DTO")
  public static class UpdateSectionRequest {

    @NotBlank(message = "섹션 제목은 필수입니다.")
    @Schema(description = "섹션 제목", example = "Section 1. Spring Security 핵심 개념")
    private String title;

    @Schema(description = "섹션 설명", example = "Spring Security의 핵심 개념을 정리합니다.")
    private String description;

    @NotNull(message = "섹션 순서는 필수입니다.")
    @PositiveOrZero(message = "섹션 순서는 0 이상이어야 합니다.")
    @Schema(description = "섹션 순서", example = "1")
    private Integer orderIndex;

    @NotNull(message = "섹션 공개 여부는 필수입니다.")
    @Schema(description = "섹션 공개 여부", example = "true")
    private Boolean isPublished;
  }
}

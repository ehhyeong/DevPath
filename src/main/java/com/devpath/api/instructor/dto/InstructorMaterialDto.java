package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;

// 강사용 레슨 첨부 자료 메타데이터 DTO를 제공한다.
public class InstructorMaterialDto {

  // 레슨 첨부 자료 생성 요청 DTO다.
  @Getter
  @Schema(description = "레슨 첨부 자료 생성 요청 DTO")
  public static class CreateMaterialRequest {

    @NotBlank(message = "자료 유형은 필수입니다.")
    @Schema(description = "자료 유형", example = "SLIDE")
    private String materialType;

    @NotBlank(message = "자료 URL은 필수입니다.")
    @Schema(description = "자료 URL", example = "https://cdn.devpath.com/materials/lesson-10-slide.pdf")
    private String materialUrl;

    @Schema(description = "스토리지 에셋 키", example = "lesson/materials/10/week1-slide.pdf")
    private String assetKey;

    @NotBlank(message = "원본 파일명은 필수입니다.")
    @Schema(description = "원본 파일명", example = "week1-slide.pdf")
    private String originalFileName;

    @PositiveOrZero(message = "파일 크기는 0 이상이어야 합니다.")
    @Schema(description = "파일 크기(byte)", example = "1048576")
    private Integer fileSize;

    @PositiveOrZero(message = "표시 순서는 0 이상이어야 합니다.")
    @Schema(description = "표시 순서", example = "0")
    private Integer displayOrder;
  }
}

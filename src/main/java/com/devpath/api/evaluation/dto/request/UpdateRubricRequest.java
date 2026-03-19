package com.devpath.api.evaluation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사용 루브릭 수정 요청 DTO")
public class UpdateRubricRequest {

  // 수정할 루브릭 항목 이름이다.
  @NotBlank
  @Schema(description = "루브릭 기준명", example = "JWT 필터 구현")
  private String criteriaName;

  // 수정할 루브릭 설명이다.
  @Schema(description = "루브릭 기준 설명", example = "OncePerRequestFilter를 상속해 JWT 검증을 수행했는가")
  private String criteriaDescription;

  // 수정할 최대 배점이다.
  @NotNull
  @Min(0)
  @Schema(description = "최대 배점", example = "40")
  private Integer maxPoints;

  // 수정할 표시 순서다.
  @NotNull
  @Min(0)
  @Schema(description = "루브릭 표시 순서", example = "1")
  private Integer displayOrder;

  @Builder
  public UpdateRubricRequest(
      String criteriaName, String criteriaDescription, Integer maxPoints, Integer displayOrder) {
    this.criteriaName = criteriaName;
    this.criteriaDescription = criteriaDescription;
    this.maxPoints = maxPoints;
    this.displayOrder = displayOrder;
  }
}

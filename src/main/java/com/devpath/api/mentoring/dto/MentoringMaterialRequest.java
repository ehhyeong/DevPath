package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.MentoringMaterialType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class MentoringMaterialRequest {

  private MentoringMaterialRequest() {}

  @Schema(name = "MentoringMaterialCreateRequest", description = "멘토링 미션 자료 등록 요청")
  public record Create(

      // 인증 연동 전 Swagger 테스트를 위해 멘토 ID를 요청으로 받는다.
      @Schema(description = "멘토 사용자 ID", example = "1") @NotNull(message = "멘토 ID는 필수입니다.")
          Long mentorId,

      // URL 자료인지 TEXT 가이드라인인지 구분한다.
      @Schema(description = "자료 타입", example = "URL") @NotNull(message = "자료 타입은 필수입니다.")
          MentoringMaterialType type,

      // 자료 목록에 노출될 제목이다.
      @Schema(description = "자료 제목", example = "1주차 API 설계 가이드")
          @NotBlank(message = "자료 제목은 필수입니다.")
          @Size(max = 150, message = "자료 제목은 150자 이하여야 합니다.")
          String title,

      // TEXT 타입일 때 필수로 사용되는 본문이다.
      @Schema(
              description = "텍스트 가이드라인 본문",
              example = "Controller는 Service 호출과 ApiResponse 반환만 담당합니다.")
          String content,

      // URL 타입일 때 필수로 사용되는 외부 자료 링크다.
      @Schema(description = "자료 URL", example = "https://github.com/yongha03/DevPath")
          @Size(max = 1000, message = "자료 URL은 1000자 이하여야 합니다.")
          String url,

      // 같은 미션 내 자료 정렬 순서다.
      @Schema(description = "정렬 순서", example = "1")
          @NotNull(message = "정렬 순서는 필수입니다.")
          @Min(value = 1, message = "정렬 순서는 1 이상이어야 합니다.")
          Integer sortOrder) {}

  @Schema(name = "MentoringMaterialUpdateRequest", description = "멘토링 미션 자료 수정 요청")
  public record Update(

      // 해당 자료가 속한 멘토링의 멘토 권한 검증에 사용한다.
      @Schema(description = "멘토 사용자 ID", example = "1") @NotNull(message = "멘토 ID는 필수입니다.")
          Long mentorId,

      // 수정 후 자료 타입이다.
      @Schema(description = "자료 타입", example = "TEXT") @NotNull(message = "자료 타입은 필수입니다.")
          MentoringMaterialType type,

      // 수정 후 자료 제목이다.
      @Schema(description = "자료 제목", example = "1주차 코드 리뷰 체크리스트")
          @NotBlank(message = "자료 제목은 필수입니다.")
          @Size(max = 150, message = "자료 제목은 150자 이하여야 합니다.")
          String title,

      // TEXT 타입일 때 필수로 사용되는 본문이다.
      @Schema(description = "텍스트 가이드라인 본문", example = "DTO에는 @Schema를 붙이고 Entity를 직접 반환하지 않습니다.")
          String content,

      // URL 타입일 때 필수로 사용되는 외부 자료 링크다.
      @Schema(description = "자료 URL", example = "https://docs.spring.io/spring-boot")
          @Size(max = 1000, message = "자료 URL은 1000자 이하여야 합니다.")
          String url,

      // 수정 후 정렬 순서다.
      @Schema(description = "정렬 순서", example = "2")
          @NotNull(message = "정렬 순서는 필수입니다.")
          @Min(value = 1, message = "정렬 순서는 1 이상이어야 합니다.")
          Integer sortOrder) {}
}

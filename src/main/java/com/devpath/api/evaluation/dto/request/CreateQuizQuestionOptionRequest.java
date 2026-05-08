package com.devpath.api.evaluation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사용 퀴즈 선택지 생성 요청 DTO")
public class CreateQuizQuestionOptionRequest {

  // Evaluation Swagger 문서화 기준에 맞춘 퀴즈 선택지 생성 요청 DTO다.
  @NotBlank
  @Schema(description = "선택지 내용", example = "서버 세션 없이 인증 상태를 유지할 수 있다.")
  private String optionText;

  @Schema(description = "해당 선택지를 정답으로 표시할지 여부", example = "false")
  private Boolean isCorrect;

  @Min(0)
  @Schema(description = "선택지 노출 순서", example = "1")
  private Integer displayOrder;

  @Builder
  public CreateQuizQuestionOptionRequest(
      String optionText, Boolean isCorrect, Integer displayOrder) {
    this.optionText = optionText;
    this.isCorrect = isCorrect;
    this.displayOrder = displayOrder;
  }
}

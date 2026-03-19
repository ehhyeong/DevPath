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

  // 사용자에게 보여줄 선택지 문구다.
  @NotBlank
  @Schema(description = "선택지 내용", example = "JWT는 서버 세션을 저장한다.")
  private String optionText;

  // 이 선택지가 정답인지 여부이며 초기 생성 시 false로 두고 이후 정답/해설 API에서 바꿔도 된다.
  @Schema(description = "정답 여부", example = "false")
  private Boolean isCorrect;

  // 선택지 노출 순서다.
  @Min(0)
  @Schema(description = "선택지 노출 순서", example = "1")
  private Integer displayOrder;

  @Builder
  public CreateQuizQuestionOptionRequest(String optionText, Boolean isCorrect, Integer displayOrder) {
    this.optionText = optionText;
    this.isCorrect = isCorrect;
    this.displayOrder = displayOrder;
  }
}

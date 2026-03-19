package com.devpath.api.evaluation.dto.request;

import com.devpath.domain.learning.entity.QuestionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사용 퀴즈 문항 생성 요청 DTO")
public class CreateQuizQuestionRequest {

  // 객관식, OX, 주관식 중 어떤 문항인지 지정한다.
  @NotNull
  @Schema(description = "문항 유형", example = "MULTIPLE_CHOICE")
  private QuestionType questionType;

  // 실제 문제 본문이다.
  @NotBlank
  @Schema(description = "문항 내용", example = "JWT의 특징으로 가장 적절한 것은?")
  private String questionText;

  // 초기 생성 시 해설까지 함께 넣고 싶을 때 사용한다.
  @Schema(description = "해설", example = "JWT는 stateless 인증에 자주 사용된다.")
  private String explanation;

  // 해당 문항의 배점이다.
  @NotNull
  @Min(0)
  @Schema(description = "문항 배점", example = "20")
  private Integer points;

  // 문항 노출 순서다.
  @NotNull
  @Min(0)
  @Schema(description = "문항 노출 순서", example = "1")
  private Integer displayOrder;

  // AI 문제라면 영상 타임코드나 근거 구간을 저장할 수 있다.
  @Schema(description = "AI 생성 근거 구간", example = "00:10:15-00:11:03")
  private String sourceTimestamp;

  // 객관식과 OX는 일반 선택지로 사용하고 주관식은 정답 텍스트를 담는 옵션 1개를 사용하는 방식으로 저장한다.
  @Valid
  @NotEmpty
  @Schema(description = "선택지 목록")
  private List<CreateQuizQuestionOptionRequest> options = new ArrayList<>();

  @Builder
  public CreateQuizQuestionRequest(
      QuestionType questionType,
      String questionText,
      String explanation,
      Integer points,
      Integer displayOrder,
      String sourceTimestamp,
      List<CreateQuizQuestionOptionRequest> options) {
    this.questionType = questionType;
    this.questionText = questionText;
    this.explanation = explanation;
    this.points = points;
    this.displayOrder = displayOrder;
    this.sourceTimestamp = sourceTimestamp;
    this.options = options == null ? new ArrayList<>() : options;
  }
}

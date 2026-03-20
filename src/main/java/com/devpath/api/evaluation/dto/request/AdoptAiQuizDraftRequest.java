package com.devpath.api.evaluation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "AI 퀴즈 초안 채택 요청 DTO")
public class AdoptAiQuizDraftRequest {

  @Schema(description = "최종 퀴즈 제목", example = "Spring Security 최종 퀴즈")
  private String title;

  @Schema(description = "최종 퀴즈 설명", example = "강사가 최종 검토 후 채택한 퀴즈입니다.")
  private String description;

  @Schema(description = "즉시 공개 여부", example = "true")
  private Boolean publish;

  @Schema(description = "정답 공개 여부", example = "true")
  private Boolean exposeAnswer;

  @Schema(description = "해설 공개 여부", example = "true")
  private Boolean exposeExplanation;

  @Builder
  public AdoptAiQuizDraftRequest(
      String title,
      String description,
      Boolean publish,
      Boolean exposeAnswer,
      Boolean exposeExplanation) {
    this.title = title;
    this.description = description;
    this.publish = publish;
    this.exposeAnswer = exposeAnswer;
    this.exposeExplanation = exposeExplanation;
  }
}

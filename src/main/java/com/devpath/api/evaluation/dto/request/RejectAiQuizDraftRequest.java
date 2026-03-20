package com.devpath.api.evaluation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "AI 퀴즈 초안 거부 요청 DTO")
public class RejectAiQuizDraftRequest {

  @NotBlank
  @Schema(description = "거부 사유", example = "문항 정확도가 낮아 재생성이 필요합니다.")
  private String reason;

  @Builder
  public RejectAiQuizDraftRequest(String reason) {
    this.reason = reason;
  }
}

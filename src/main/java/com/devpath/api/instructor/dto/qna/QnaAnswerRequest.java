package com.devpath.api.instructor.dto.qna;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "QnA 답변 등록/수정 요청")
public class QnaAnswerRequest {

  @NotBlank(message = "답변 내용은 비어 있을 수 없습니다.")
  @Schema(
      description = "답변 본문",
      example = "현재 증상은 Transaction 범위가 분리되어 LazyInitializationException이 발생한 케이스입니다.")
  private String content;
}

package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.QuestionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class QnaRequest {

  private QnaRequest() {}

  @Schema(name = "QnaQuestionCreateRequest", description = "Q&A 질문 작성 요청")
  public record QuestionCreate(
      @Schema(hidden = true) Long writerId,
      // 질문 목록과 상세 화면에 표시되는 제목이다.
      @Schema(description = "질문 제목", example = "PR 리뷰 기준이 궁금합니다.")
          @NotBlank(message = "질문 제목은 필수입니다.")
          @Size(max = 150, message = "질문 제목은 150자 이하여야 합니다.")
          String title,
      // 질문 본문이다.
      @Schema(description = "질문 내용", example = "Service 계층에서 검증 로직을 어느 정도까지 처리해야 하나요?")
          @NotBlank(message = "질문 내용은 필수입니다.")
          @Size(max = 3000, message = "질문 내용은 3000자 이하여야 합니다.")
          String content) {}

  @Schema(name = "QnaAnswerCreateRequest", description = "Q&A 답변 작성 요청")
  public record AnswerCreate(
      @Schema(hidden = true) Long writerId,
      // 답변 본문이다.
      @Schema(
              description = "답변 내용",
              example = "Controller는 얇게 유지하고, 검증과 상태 변경은 Service에서 처리하는 것이 좋습니다.")
          @NotBlank(message = "답변 내용은 필수입니다.")
          @Size(max = 3000, message = "답변 내용은 3000자 이하여야 합니다.")
          String content) {}

  @Schema(name = "QnaStatusUpdateRequest", description = "Q&A 질문 상태 변경 요청")
  public record StatusUpdate(
      @Schema(hidden = true) Long requesterId,
      // 변경할 질문 상태다.
      @Schema(description = "변경할 질문 상태", example = "CLOSED") @NotNull(message = "질문 상태는 필수입니다.")
          QuestionStatus status) {}
}

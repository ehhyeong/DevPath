package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.QnaStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "질문 상태 변경 요청 DTO")
public class QuestionStatusUpdateRequest {

  @NotNull(message = "질문 상태는 필수입니다.")
  @Schema(description = "질문 상태", example = "ANSWERED")
  private QnaStatus status;

  @Builder
  private QuestionStatusUpdateRequest(QnaStatus status) {
    this.status = status;
  }
}

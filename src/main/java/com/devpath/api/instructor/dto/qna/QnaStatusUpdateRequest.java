package com.devpath.api.instructor.dto.qna;

import com.devpath.domain.qna.entity.QnaStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "QnA 상태 변경 요청")
public class QnaStatusUpdateRequest {

  @NotNull
  @Schema(
      description = "질문 상태",
      example = "ANSWERED",
      allowableValues = {"UNANSWERED", "ANSWERED"})
  private QnaStatus status;
}

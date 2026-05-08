package com.devpath.api.evaluation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "강사용 퀴즈 정답 및 해설 수정 요청 DTO")
public class UpdateQuizAnswerExplanationRequest {

  // Evaluation Swagger 문서화 기준에 맞춘 퀴즈 정답/해설 수정 요청 DTO다.
  @Schema(description = "문항 해설", example = "JWT는 서버 세션 대신 토큰으로 인증 상태를 표현하는 stateless 방식에 적합합니다.")
  private String explanation;

  @Schema(description = "AI 생성 문항일 경우 수정할 근거 타임스탬프", example = "00:10:15-00:11:03")
  private String sourceTimestamp;

  @NotEmpty
  @Schema(description = "정답으로 지정할 선택지 ID 목록", example = "[11]")
  private List<@NotNull Long> correctOptionIds = new ArrayList<>();

  @Builder
  public UpdateQuizAnswerExplanationRequest(
      String explanation, String sourceTimestamp, List<Long> correctOptionIds) {
    this.explanation = explanation;
    this.sourceTimestamp = sourceTimestamp;
    this.correctOptionIds = correctOptionIds == null ? new ArrayList<>() : correctOptionIds;
  }
}

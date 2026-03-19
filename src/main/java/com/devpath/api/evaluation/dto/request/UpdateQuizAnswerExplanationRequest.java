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
@Schema(description = "강사용 퀴즈 정답/해설 저장 요청 DTO")
public class UpdateQuizAnswerExplanationRequest {

  // 응시 후 보여줄 해설 내용이다.
  @Schema(description = "문항 해설", example = "JWT는 서버에 세션을 저장하지 않는 stateless 방식에 적합하다.")
  private String explanation;

  // AI 생성 문제라면 근거 구간을 수정할 때 사용한다.
  @Schema(description = "AI 생성 근거 구간", example = "00:10:15-00:11:03")
  private String sourceTimestamp;

  // 정답으로 처리할 선택지 ID 목록이며 주관식도 정답 텍스트를 담고 있는 option ID 1개를 넣는 방식으로 사용한다.
  @NotEmpty
  @Schema(description = "정답 선택지 ID 목록", example = "[11]")
  private List<@NotNull Long> correctOptionIds = new ArrayList<>();

  @Builder
  public UpdateQuizAnswerExplanationRequest(
      String explanation, String sourceTimestamp, List<Long> correctOptionIds) {
    this.explanation = explanation;
    this.sourceTimestamp = sourceTimestamp;
    this.correctOptionIds = correctOptionIds == null ? new ArrayList<>() : correctOptionIds;
  }
}

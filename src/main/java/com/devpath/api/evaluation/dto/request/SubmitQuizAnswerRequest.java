package com.devpath.api.evaluation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "학습자 퀴즈 문항별 답안 요청 DTO")
public class SubmitQuizAnswerRequest {

    // 어떤 문항에 대한 답안인지 식별하기 위한 questionId다.
    @NotNull
    @Schema(description = "문항 ID", example = "10")
    private Long questionId;

    // 객관식 또는 OX 문항일 때 선택한 선택지 ID다.
    @Schema(description = "선택한 선택지 ID", example = "100")
    private Long selectedOptionId;

    // 주관식 문항일 때 사용자가 직접 입력한 텍스트 답안이다.
    @Schema(description = "주관식 답안", example = "Spring Security")
    private String textAnswer;

    @Builder
    public SubmitQuizAnswerRequest(Long questionId, Long selectedOptionId, String textAnswer) {
        this.questionId = questionId;
        this.selectedOptionId = selectedOptionId;
        this.textAnswer = textAnswer;
    }
}

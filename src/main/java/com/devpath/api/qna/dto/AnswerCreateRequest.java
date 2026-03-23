package com.devpath.api.qna.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "답변 등록 요청 DTO")
public class AnswerCreateRequest {

    @NotBlank(message = "답변 내용을 입력해주세요.")
    @Schema(description = "답변 내용", example = "SecurityFilterChain 설정과 OncePerRequestFilter 적용 위치를 먼저 점검해보세요.")
    private String content;
}

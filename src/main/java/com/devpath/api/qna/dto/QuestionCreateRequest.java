package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.QuestionDifficulty;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "질문 등록 요청 DTO")
public class QuestionCreateRequest {

    @NotNull(message = "질문 템플릿 타입은 필수입니다.")
    @Schema(description = "질문 템플릿 타입", example = "DEBUGGING")
    private QuestionTemplateType templateType;

    @NotNull(message = "질문 난이도는 필수입니다.")
    @Schema(description = "질문 난이도", example = "MEDIUM")
    private QuestionDifficulty difficulty;

    @NotBlank(message = "질문 제목을 입력해주세요.")
    @Schema(description = "질문 제목", example = "Spring Boot에서 JWT 필터가 두 번 실행됩니다.")
    private String title;

    @NotBlank(message = "질문 내용을 입력해주세요.")
    @Schema(description = "질문 본문", example = "OncePerRequestFilter를 사용했는데도 로그가 두 번 찍힙니다. 원인이 뭘까요?")
    private String content;
}

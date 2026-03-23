package com.devpath.api.qna.dto;

import com.devpath.common.swagger.SwaggerDocConstants;
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
    @Schema(
            description = SwaggerDocConstants.QUESTION_TEMPLATE_TYPE_DESCRIPTION,
            example = "DEBUGGING",
            allowableValues = {"DEBUGGING", "IMPLEMENTATION", "CODE_REVIEW", "CAREER", "STUDY", "PROJECT"}
    )
    private QuestionTemplateType templateType;

    @NotNull(message = "질문 난이도는 필수입니다.")
    @Schema(
            description = SwaggerDocConstants.QUESTION_DIFFICULTY_DESCRIPTION,
            example = "MEDIUM",
            allowableValues = {"EASY", "MEDIUM", "HARD"}
    )
    private QuestionDifficulty difficulty;

    @NotBlank(message = "질문 제목을 입력해주세요.")
    @Schema(
            description = "중복 질문 추천에도 사용되는 질문 제목입니다.",
            example = "Spring Boot에서 JWT 필터가 두 번 실행됩니다."
    )
    private String title;

    @NotBlank(message = "질문 내용을 입력해주세요.")
    @Schema(
            description = "재현 방법, 기대 결과, 실제 결과를 포함한 질문 본문입니다.",
            example = "OncePerRequestFilter를 사용했는데도 로그가 두 번 찍힙니다. SecurityFilterChain 설정도 함께 봐야 할까요?"
    )
    private String content;
}

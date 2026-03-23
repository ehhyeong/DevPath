package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.Question;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "중복 질문 추천 응답 DTO")
public class DuplicateQuestionSuggestionResponse {

    @Schema(description = "질문 ID", example = "10")
    private Long questionId;

    @Schema(description = "질문 제목", example = "Spring Security에서 JWT 필터가 두 번 실행됩니다.")
    private String title;

    @Schema(description = "작성자 이름", example = "김태형")
    private String authorName;

    @Schema(description = "질문 템플릿 타입", example = "DEBUGGING")
    private String templateType;

    @Schema(description = "추천 매칭 키워드", example = "jwt")
    private String matchedKeyword;

    @Schema(description = "질문 작성 일시", example = "2026-03-24T10:30:00")
    private LocalDateTime createdAt;

    public static DuplicateQuestionSuggestionResponse from(Question question, String matchedKeyword) {
        return DuplicateQuestionSuggestionResponse.builder()
                .questionId(question.getId())
                .title(question.getTitle())
                .authorName(question.getUser().getName())
                .templateType(question.getTemplateType().name())
                .matchedKeyword(matchedKeyword)
                .createdAt(question.getCreatedAt())
                .build();
    }
}

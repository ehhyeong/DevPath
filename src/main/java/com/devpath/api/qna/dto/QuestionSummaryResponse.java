package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.Question;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "질문 목록 응답 DTO")
public class QuestionSummaryResponse {

    @Schema(description = "질문 ID", example = "10")
    private Long id;

    @Schema(description = "작성자 ID", example = "1")
    private Long authorId;

    @Schema(description = "작성자 이름", example = "김태형")
    private String authorName;

    @Schema(description = "질문 템플릿 타입", example = "DEBUGGING")
    private String templateType;

    @Schema(description = "질문 난이도", example = "MEDIUM")
    private String difficulty;

    @Schema(description = "질문 제목", example = "Spring Security에서 403이 발생합니다.")
    private String title;

    @Schema(description = "채택된 답변 ID", example = "25", nullable = true)
    private Long adoptedAnswerId;

    @Schema(description = "조회수", example = "12")
    private int viewCount;

    @Schema(description = "질문 작성 일시", example = "2026-03-23T18:00:00")
    private LocalDateTime createdAt;

    // 엔티티를 질문 목록 응답 DTO로 변환한다.
    public static QuestionSummaryResponse from(Question question) {
        return QuestionSummaryResponse.builder()
                .id(question.getId())
                .authorId(question.getUser().getId())
                .authorName(question.getUser().getName())
                .templateType(question.getTemplateType().name())
                .difficulty(question.getDifficulty().name())
                .title(question.getTitle())
                .adoptedAnswerId(question.getAdoptedAnswerId())
                .viewCount(question.getViewCount())
                .createdAt(question.getCreatedAt())
                .build();
    }
}

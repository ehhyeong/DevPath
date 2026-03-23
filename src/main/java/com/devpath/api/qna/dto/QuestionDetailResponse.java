package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.Question;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "질문 상세 응답 DTO")
public class QuestionDetailResponse {

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

    @Schema(description = "질문 제목", example = "Spring Boot에서 JWT 필터가 두 번 실행됩니다.")
    private String title;

    @Schema(description = "질문 본문", example = "OncePerRequestFilter를 사용했는데도 로그가 두 번 찍힙니다.")
    private String content;

    @Schema(description = "채택된 답변 ID", example = "25", nullable = true)
    private Long adoptedAnswerId;

    @Schema(description = "조회수", example = "13")
    private int viewCount;

    @Schema(description = "질문 작성 일시", example = "2026-03-23T18:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "질문 수정 일시", example = "2026-03-23T18:05:00")
    private LocalDateTime updatedAt;

    @Schema(description = "답변 목록")
    private List<AnswerResponse> answers;

    // 질문 엔티티와 답변 목록을 상세 응답 DTO로 변환한다.
    public static QuestionDetailResponse from(Question question, List<AnswerResponse> answers) {
        return QuestionDetailResponse.builder()
                .id(question.getId())
                .authorId(question.getUser().getId())
                .authorName(question.getUser().getName())
                .templateType(question.getTemplateType().name())
                .difficulty(question.getDifficulty().name())
                .title(question.getTitle())
                .content(question.getContent())
                .adoptedAnswerId(question.getAdoptedAnswerId())
                .viewCount(question.getViewCount())
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .answers(answers)
                .build();
    }
}

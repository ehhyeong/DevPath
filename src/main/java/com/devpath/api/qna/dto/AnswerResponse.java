package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.Answer;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "답변 응답 DTO")
public class AnswerResponse {

    @Schema(description = "답변 ID", example = "30")
    private Long id;

    @Schema(description = "작성자 ID", example = "2")
    private Long authorId;

    @Schema(description = "작성자 이름", example = "홍길동")
    private String authorName;

    @Schema(description = "답변 내용", example = "SecurityContextHolder 접근 시점과 FilterChain 구조를 확인해보세요.")
    private String content;

    @Schema(description = "채택 여부", example = "false")
    private boolean adopted;

    @Schema(description = "답변 작성 일시", example = "2026-03-23T18:10:00")
    private LocalDateTime createdAt;

    // 엔티티를 답변 응답 DTO로 변환한다.
    public static AnswerResponse from(Answer answer) {
        return AnswerResponse.builder()
                .id(answer.getId())
                .authorId(answer.getUser().getId())
                .authorName(answer.getUser().getName())
                .content(answer.getContent())
                .adopted(answer.isAdopted())
                .createdAt(answer.getCreatedAt())
                .build();
    }
}

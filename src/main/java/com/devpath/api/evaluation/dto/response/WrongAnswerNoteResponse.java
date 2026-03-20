package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.WrongAnswerNote;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "오답 노트 응답 DTO")
public class WrongAnswerNoteResponse {

    // 저장된 오답 노트 ID다.
    @Schema(description = "오답 노트 ID", example = "1")
    private Long noteId;

    // 오답 노트가 연결된 응시 ID다.
    @Schema(description = "응시 ID", example = "100")
    private Long attemptId;

    // 오답 노트가 연결된 문항 ID다.
    @Schema(description = "문항 ID", example = "10")
    private Long questionId;

    // 오답 노트를 작성한 학습자 ID다.
    @Schema(description = "학습자 ID", example = "1")
    private Long learnerId;

    // 오답 노트 내용이다.
    @Schema(description = "오답 노트 내용", example = "정답 공개 후 개념을 다시 정리해야 한다.")
    private String noteContent;

    // 복습 완료 여부다.
    @Schema(description = "복습 완료 여부", example = "false")
    private Boolean reviewed;

    // 생성 시각이다.
    @Schema(description = "생성 시각", example = "2026-03-20T10:15:30")
    private LocalDateTime createdAt;

    @Builder
    public WrongAnswerNoteResponse(
            Long noteId,
            Long attemptId,
            Long questionId,
            Long learnerId,
            String noteContent,
            Boolean reviewed,
            LocalDateTime createdAt
    ) {
        this.noteId = noteId;
        this.attemptId = attemptId;
        this.questionId = questionId;
        this.learnerId = learnerId;
        this.noteContent = noteContent;
        this.reviewed = reviewed;
        this.createdAt = createdAt;
    }

    // 엔티티를 응답 DTO로 변환한다.
    public static WrongAnswerNoteResponse from(WrongAnswerNote wrongAnswerNote) {
        return WrongAnswerNoteResponse.builder()
                .noteId(wrongAnswerNote.getId())
                .attemptId(wrongAnswerNote.getAttempt().getId())
                .questionId(wrongAnswerNote.getQuestion().getId())
                .learnerId(wrongAnswerNote.getLearner().getId())
                .noteContent(wrongAnswerNote.getNoteContent())
                .reviewed(wrongAnswerNote.getIsReviewed())
                .createdAt(wrongAnswerNote.getCreatedAt())
                .build();
    }
}

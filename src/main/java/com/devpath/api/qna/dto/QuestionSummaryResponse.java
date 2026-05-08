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

  @Schema(description = "질문 소속 범위", example = "MENTORING")
  private String questionScope;

  @Schema(description = "멘토링 ID", example = "1", nullable = true)
  private Long mentoringId;

  @Schema(description = "워크스페이스 ID", example = "1", nullable = true)
  private Long workspaceId;

  @Schema(description = "Course ID", example = "1", nullable = true)
  private Long courseId;

  @Schema(description = "Lesson ID", example = "10", nullable = true)
  private Long lessonId;

  @Schema(description = "질문 템플릿 타입", example = "DEBUGGING")
  private String templateType;

  @Schema(description = "질문 난이도", example = "MEDIUM")
  private String difficulty;

  @Schema(description = "질문 제목", example = "Spring Security에서 403이 발생합니다.")
  private String title;

  @Schema(description = "채택된 답변 ID", example = "25", nullable = true)
  private Long adoptedAnswerId;

  @Schema(description = "Lecture timestamp", example = "00:12:44", nullable = true)
  private String lectureTimestamp;

  @Schema(description = "질문 상태", example = "UNANSWERED")
  private String qnaStatus;

  @Schema(description = "Answer count", example = "2")
  private int answerCount;

  @Schema(description = "조회수", example = "12")
  private int viewCount;

  @Schema(description = "질문 작성 일시", example = "2026-03-23T18:00:00")
  private LocalDateTime createdAt;

  public static QuestionSummaryResponse from(Question question) {
    return from(question, 0);
  }

  public static QuestionSummaryResponse from(Question question, int answerCount) {
    return QuestionSummaryResponse.builder()
        .id(question.getId())
        .authorId(question.getUser().getId())
        .authorName(question.getUser().getName())
        .questionScope(
            question.getQuestionScope() == null ? null : question.getQuestionScope().name())
        .mentoringId(question.getMentoringId())
        .workspaceId(question.getWorkspaceId())
        .courseId(question.getCourseId())
        .lessonId(question.getLessonId())
        .templateType(question.getTemplateType().name())
        .difficulty(question.getDifficulty().name())
        .title(question.getTitle())
        .adoptedAnswerId(question.getAdoptedAnswerId())
        .lectureTimestamp(question.getLectureTimestamp())
        .qnaStatus(question.getQnaStatus().name())
        .answerCount(answerCount)
        .viewCount(question.getViewCount())
        .createdAt(question.getCreatedAt())
        .build();
  }
}

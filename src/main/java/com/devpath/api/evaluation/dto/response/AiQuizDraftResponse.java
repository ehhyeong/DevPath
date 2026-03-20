package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.QuizType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "AI 퀴즈 초안 응답 DTO")
public class AiQuizDraftResponse {

  @Schema(description = "초안 ID", example = "1")
  private Long draftId;

  @Schema(description = "로드맵 노드 ID", example = "10")
  private Long nodeId;

  @Schema(description = "초안 제목", example = "Spring Security AI 초안 퀴즈")
  private String title;

  @Schema(description = "초안 설명", example = "영상 내용을 바탕으로 생성한 AI 초안입니다.")
  private String description;

  @Schema(description = "퀴즈 생성 방식", example = "AI_VIDEO")
  private QuizType quizType;

  @Schema(description = "초안 상태", example = "DRAFT")
  private String status;

  @Schema(description = "근거 구간", example = "12:10-13:20")
  private String sourceTimestamp;

  @Schema(description = "문항 개수", example = "3")
  private Integer questionCount;

  @Schema(description = "채택된 실제 퀴즈 ID", example = "101")
  private Long adoptedQuizId;

  @Schema(description = "거부 사유", example = "정확도 보완 필요")
  private String rejectedReason;

  @Schema(description = "생성 시각", example = "2026-03-21T10:00:00")
  private LocalDateTime createdAt;

  @Schema(description = "초안 문항 목록")
  private List<QuestionDraftItem> questions = new ArrayList<>();

  @Builder
  public AiQuizDraftResponse(
      Long draftId,
      Long nodeId,
      String title,
      String description,
      QuizType quizType,
      String status,
      String sourceTimestamp,
      Integer questionCount,
      Long adoptedQuizId,
      String rejectedReason,
      LocalDateTime createdAt,
      List<QuestionDraftItem> questions) {
    this.draftId = draftId;
    this.nodeId = nodeId;
    this.title = title;
    this.description = description;
    this.quizType = quizType;
    this.status = status;
    this.sourceTimestamp = sourceTimestamp;
    this.questionCount = questionCount;
    this.adoptedQuizId = adoptedQuizId;
    this.rejectedReason = rejectedReason;
    this.createdAt = createdAt;
    this.questions = questions == null ? new ArrayList<>() : questions;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "AI 초안 문항 항목 DTO")
  public static class QuestionDraftItem {

    @Schema(description = "초안 문항 ID", example = "1")
    private Long draftQuestionId;

    @Schema(description = "문항 유형", example = "MULTIPLE_CHOICE")
    private QuestionType questionType;

    @Schema(description = "문항 본문", example = "Spring Security의 핵심 역할은 무엇인가?")
    private String questionText;

    @Schema(description = "해설", example = "인증과 인가를 지원합니다.")
    private String explanation;

    @Schema(description = "배점", example = "5")
    private Integer points;

    @Schema(description = "노출 순서", example = "1")
    private Integer displayOrder;

    @Schema(description = "근거 구간", example = "12:10-13:20")
    private String sourceTimestamp;

    @Schema(description = "선택지 목록")
    private List<OptionDraftItem> options = new ArrayList<>();

    @Builder
    public QuestionDraftItem(
        Long draftQuestionId,
        QuestionType questionType,
        String questionText,
        String explanation,
        Integer points,
        Integer displayOrder,
        String sourceTimestamp,
        List<OptionDraftItem> options) {
      this.draftQuestionId = draftQuestionId;
      this.questionType = questionType;
      this.questionText = questionText;
      this.explanation = explanation;
      this.points = points;
      this.displayOrder = displayOrder;
      this.sourceTimestamp = sourceTimestamp;
      this.options = options == null ? new ArrayList<>() : options;
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "AI 초안 선택지 항목 DTO")
  public static class OptionDraftItem {

    @Schema(description = "초안 선택지 ID", example = "1")
    private Long draftOptionId;

    @Schema(description = "선택지 내용", example = "인증과 인가")
    private String optionText;

    @Schema(description = "정답 여부", example = "true")
    private Boolean correct;

    @Schema(description = "노출 순서", example = "1")
    private Integer displayOrder;

    @Builder
    public OptionDraftItem(
        Long draftOptionId, String optionText, Boolean correct, Integer displayOrder) {
      this.draftOptionId = draftOptionId;
      this.optionText = optionText;
      this.correct = correct;
      this.displayOrder = displayOrder;
    }
  }
}

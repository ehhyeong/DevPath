package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.entity.QuizType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사용 퀴즈 상세 응답 DTO")
public class QuizDetailResponse {

  // 퀴즈 ID다.
  private Long quizId;

  // 연결된 로드맵 노드 ID다.
  private Long roadmapNodeId;

  // 퀴즈 제목이다.
  private String title;

  // 퀴즈 설명이다.
  private String description;

  // 퀴즈 생성 유형이다.
  private QuizType quizType;

  // 퀴즈 총점이다.
  private Integer totalScore;

  // 퀴즈 공개 여부다.
  private Boolean isPublished;

  // 퀴즈 활성 여부다.
  private Boolean isActive;

  // 정답 공개 여부다.
  private Boolean exposeAnswer;

  // 해설 공개 여부다.
  private Boolean exposeExplanation;

  // 퀴즈 생성 시각이다.
  private LocalDateTime createdAt;

  // 문항 목록이다.
  private List<QuestionInfo> questions;

  @Builder
  public QuizDetailResponse(
      Long quizId,
      Long roadmapNodeId,
      String title,
      String description,
      QuizType quizType,
      Integer totalScore,
      Boolean isPublished,
      Boolean isActive,
      Boolean exposeAnswer,
      Boolean exposeExplanation,
      LocalDateTime createdAt,
      List<QuestionInfo> questions) {
    this.quizId = quizId;
    this.roadmapNodeId = roadmapNodeId;
    this.title = title;
    this.description = description;
    this.quizType = quizType;
    this.totalScore = totalScore;
    this.isPublished = isPublished;
    this.isActive = isActive;
    this.exposeAnswer = exposeAnswer;
    this.exposeExplanation = exposeExplanation;
    this.createdAt = createdAt;
    this.questions = questions;
  }

  // Quiz 엔티티를 응답 DTO로 변환한다.
  public static QuizDetailResponse from(Quiz quiz) {
    return QuizDetailResponse.builder()
        .quizId(quiz.getId())
        .roadmapNodeId(quiz.getRoadmapNode().getNodeId())
        .title(quiz.getTitle())
        .description(quiz.getDescription())
        .quizType(quiz.getQuizType())
        .totalScore(quiz.getTotalScore())
        .isPublished(quiz.getIsPublished())
        .isActive(quiz.getIsActive())
        .exposeAnswer(quiz.getExposeAnswer())
        .exposeExplanation(quiz.getExposeExplanation())
        .createdAt(quiz.getCreatedAt())
        .questions(
            quiz.getQuestions().stream()
                .filter(question -> !Boolean.TRUE.equals(question.getIsDeleted()))
                .sorted(Comparator.comparing(QuizQuestion::getDisplayOrder))
                .map(QuestionInfo::from)
                .toList())
        .build();
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class QuestionInfo {

    // 문항 ID다.
    private Long questionId;

    // 문항 유형이다.
    private String questionType;

    // 문항 본문이다.
    private String questionText;

    // 해설이다.
    private String explanation;

    // 배점이다.
    private Integer points;

    // 문항 노출 순서다.
    private Integer displayOrder;

    // AI 생성 근거 구간이다.
    private String sourceTimestamp;

    // 선택지 목록이다.
    private List<OptionInfo> options;

    @Builder
    public QuestionInfo(
        Long questionId,
        String questionType,
        String questionText,
        String explanation,
        Integer points,
        Integer displayOrder,
        String sourceTimestamp,
        List<OptionInfo> options) {
      this.questionId = questionId;
      this.questionType = questionType;
      this.questionText = questionText;
      this.explanation = explanation;
      this.points = points;
      this.displayOrder = displayOrder;
      this.sourceTimestamp = sourceTimestamp;
      this.options = options;
    }

    // QuizQuestion 엔티티를 문항 응답 DTO로 변환한다.
    public static QuestionInfo from(QuizQuestion question) {
      return QuestionInfo.builder()
          .questionId(question.getId())
          .questionType(question.getQuestionType().name())
          .questionText(question.getQuestionText())
          .explanation(question.getExplanation())
          .points(question.getPoints())
          .displayOrder(question.getDisplayOrder())
          .sourceTimestamp(question.getSourceTimestamp())
          .options(
              question.getOptions().stream()
                  .filter(option -> !Boolean.TRUE.equals(option.getIsDeleted()))
                  .sorted(Comparator.comparing(QuizQuestionOption::getDisplayOrder))
                  .map(OptionInfo::from)
                  .toList())
          .build();
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class OptionInfo {

    // 선택지 ID다.
    private Long optionId;

    // 선택지 내용이다.
    private String optionText;

    // 정답 여부다.
    private Boolean isCorrect;

    // 노출 순서다.
    private Integer displayOrder;

    @Builder
    public OptionInfo(Long optionId, String optionText, Boolean isCorrect, Integer displayOrder) {
      this.optionId = optionId;
      this.optionText = optionText;
      this.isCorrect = isCorrect;
      this.displayOrder = displayOrder;
    }

    // QuizQuestionOption 엔티티를 선택지 응답 DTO로 변환한다.
    public static OptionInfo from(QuizQuestionOption option) {
      return OptionInfo.builder()
          .optionId(option.getId())
          .optionText(option.getOptionText())
          .isCorrect(option.getIsCorrect())
          .displayOrder(option.getDisplayOrder())
          .build();
    }
  }
}

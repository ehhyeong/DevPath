package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.QuizType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "문제 은행 통계 응답 DTO")
public class QuestionBankStatsResponse {

  @Schema(description = "전체 문제 수", example = "42")
  private Long totalQuestionCount;

  @Schema(description = "객관식 문제 수", example = "20")
  private Long multipleChoiceCount;

  @Schema(description = "OX 문제 수", example = "8")
  private Long trueFalseCount;

  @Schema(description = "주관식 문제 수", example = "14")
  private Long shortAnswerCount;

  @Schema(description = "최근 생성 문제 수", example = "6")
  private Long recentCreatedQuestionCount;

  @Schema(description = "채택된 AI 초안 수", example = "5")
  private Long adoptedAiDraftCount;

  @Schema(description = "퀴즈별 문제 수 목록")
  private List<QuizQuestionCountItem> quizzes = new ArrayList<>();

  @Builder
  public QuestionBankStatsResponse(
      Long totalQuestionCount,
      Long multipleChoiceCount,
      Long trueFalseCount,
      Long shortAnswerCount,
      Long recentCreatedQuestionCount,
      Long adoptedAiDraftCount,
      List<QuizQuestionCountItem> quizzes) {
    this.totalQuestionCount = totalQuestionCount;
    this.multipleChoiceCount = multipleChoiceCount;
    this.trueFalseCount = trueFalseCount;
    this.shortAnswerCount = shortAnswerCount;
    this.recentCreatedQuestionCount = recentCreatedQuestionCount;
    this.adoptedAiDraftCount = adoptedAiDraftCount;
    this.quizzes = quizzes == null ? new ArrayList<>() : quizzes;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "퀴즈별 문제 수 항목 DTO")
  public static class QuizQuestionCountItem {

    @Schema(description = "퀴즈 ID", example = "101")
    private Long quizId;

    @Schema(description = "퀴즈 제목", example = "Spring Security 최종 퀴즈")
    private String quizTitle;

    @Schema(description = "퀴즈 생성 방식", example = "AI_VIDEO")
    private QuizType quizType;

    @Schema(description = "문제 수", example = "5")
    private Integer questionCount;

    @Builder
    public QuizQuestionCountItem(
        Long quizId, String quizTitle, QuizType quizType, Integer questionCount) {
      this.quizId = quizId;
      this.quizTitle = quizTitle;
      this.quizType = quizType;
      this.questionCount = questionCount;
    }
  }
}

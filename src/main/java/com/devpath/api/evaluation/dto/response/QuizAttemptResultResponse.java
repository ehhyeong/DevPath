package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.QuestionType;
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
@Schema(description = "학습자용 퀴즈 응시 결과 응답 DTO")
public class QuizAttemptResultResponse {

  // Evaluation Swagger 문서화 기준에 맞춘 퀴즈 응시 결과 응답 DTO다.
  @Schema(description = "응시 ID", example = "1")
  private Long attemptId;

  @Schema(description = "퀴즈 ID", example = "10")
  private Long quizId;

  @Schema(description = "퀴즈 제목", example = "Spring Security 기초 퀴즈")
  private String quizTitle;

  @Schema(description = "획득 점수", example = "8")
  private Integer score;

  @Schema(description = "만점", example = "10")
  private Integer maxScore;

  @Schema(description = "통과 여부", example = "true")
  private Boolean passed;

  @Schema(description = "현재 응시 회차", example = "2")
  private Integer attemptNumber;

  @Schema(description = "응시 완료 시각", example = "2026-03-20T11:25:00")
  private LocalDateTime completedAt;

  @Schema(description = "문항별 결과 목록")
  private List<QuestionResult> questionResults = new ArrayList<>();

  @Builder
  public QuizAttemptResultResponse(
      Long attemptId,
      Long quizId,
      String quizTitle,
      Integer score,
      Integer maxScore,
      Boolean passed,
      Integer attemptNumber,
      LocalDateTime completedAt,
      List<QuestionResult> questionResults) {
    this.attemptId = attemptId;
    this.quizId = quizId;
    this.quizTitle = quizTitle;
    this.score = score;
    this.maxScore = maxScore;
    this.passed = passed;
    this.attemptNumber = attemptNumber;
    this.completedAt = completedAt;
    this.questionResults = questionResults == null ? new ArrayList<>() : questionResults;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "문항별 응시 결과 DTO")
  public static class QuestionResult {

    @Schema(description = "문항 ID", example = "100")
    private Long questionId;

    @Schema(description = "문항 유형", example = "MULTIPLE_CHOICE")
    private QuestionType questionType;

    @Schema(description = "문항 본문", example = "Spring Security의 기본 인증 필터는 무엇인가?")
    private String questionText;

    @Schema(description = "정답 여부", example = "true")
    private Boolean correct;

    @Schema(description = "문항별 획득 점수", example = "2")
    private Integer earnedPoints;

    @Schema(description = "선택한 선택지 ID", example = "1000")
    private Long selectedOptionId;

    @Schema(description = "선택한 선택지 텍스트", example = "UsernamePasswordAuthenticationFilter")
    private String selectedOptionText;

    @Schema(description = "주관식 답안", example = "UsernamePasswordAuthenticationFilter")
    private String textAnswer;

    @Schema(description = "정답 텍스트", example = "UsernamePasswordAuthenticationFilter")
    private String correctAnswerText;

    @Schema(
        description = "문항 해설",
        example = "폼 로그인 기본 인증 필터는 UsernamePasswordAuthenticationFilter입니다.")
    private String explanation;

    @Builder
    public QuestionResult(
        Long questionId,
        QuestionType questionType,
        String questionText,
        Boolean correct,
        Integer earnedPoints,
        Long selectedOptionId,
        String selectedOptionText,
        String textAnswer,
        String correctAnswerText,
        String explanation) {
      this.questionId = questionId;
      this.questionType = questionType;
      this.questionText = questionText;
      this.correct = correct;
      this.earnedPoints = earnedPoints;
      this.selectedOptionId = selectedOptionId;
      this.selectedOptionText = selectedOptionText;
      this.textAnswer = textAnswer;
      this.correctAnswerText = correctAnswerText;
      this.explanation = explanation;
    }
  }
}

package com.devpath.api.evaluation.dto.request;

import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.QuizType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "AI 퀴즈 초안 생성 요청 DTO")
public class CreateAiQuizDraftRequest {

  // Evaluation Swagger 문서화 기준에 맞춘 AI 퀴즈 초안 생성 요청 DTO다.
  @NotNull
  @Schema(description = "AI 초안을 생성할 로드맵 노드 ID", example = "10")
  private Long nodeId;

  @NotBlank
  @Schema(description = "초안 제목", example = "Spring Security AI 초안 퀴즈")
  private String title;

  @Schema(description = "초안 설명", example = "영상 내용을 바탕으로 생성한 AI 초안입니다.")
  private String description;

  @Schema(description = "퀴즈 생성 방식", example = "AI_VIDEO")
  private QuizType quizType;

  @NotBlank
  @Schema(
      description = "AI가 문항을 생성할 때 참고한 근거 원문",
      example = "Spring Security는 인증과 인가를 담당하는 프레임워크다.")
  private String sourceText;

  @Schema(description = "영상 기반 생성일 경우 참고한 타임스탬프 구간", example = "12:10-13:20")
  private String sourceTimestamp;

  @Schema(description = "Gemini inline media MIME type", example = "video/mp4")
  private String sourceMimeType;

  @Schema(description = "Gemini inline media base64 content")
  private String sourceBase64Content;

  @Schema(description = "AI 호출 없이 fallback 초안을 사용할지 여부", example = "false")
  private Boolean fallbackOnly;

  @Min(1)
  @Max(10)
  @Schema(description = "생성할 문항 개수", example = "3")
  private Integer questionCount;

  @Schema(description = "선호 문항 유형", example = "MULTIPLE_CHOICE")
  private QuestionType preferredQuestionType;

  @Min(1)
  @Max(3)
  @Schema(description = "난이도 (1=초급, 2=중급, 3=고급)", example = "2")
  private Integer difficultyLevel;

  @Builder
  public CreateAiQuizDraftRequest(
      Long nodeId,
      String title,
      String description,
      QuizType quizType,
      String sourceText,
      String sourceTimestamp,
      String sourceMimeType,
      String sourceBase64Content,
      Boolean fallbackOnly,
      Integer questionCount,
      QuestionType preferredQuestionType,
      Integer difficultyLevel) {
    this.nodeId = nodeId;
    this.title = title;
    this.description = description;
    this.quizType = quizType;
    this.sourceText = sourceText;
    this.sourceTimestamp = sourceTimestamp;
    this.sourceMimeType = sourceMimeType;
    this.sourceBase64Content = sourceBase64Content;
    this.fallbackOnly = fallbackOnly;
    this.questionCount = questionCount;
    this.preferredQuestionType = preferredQuestionType;
    this.difficultyLevel = difficultyLevel;
  }
}

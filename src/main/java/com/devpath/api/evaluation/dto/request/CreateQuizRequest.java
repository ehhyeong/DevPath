package com.devpath.api.evaluation.dto.request;

import com.devpath.domain.learning.entity.QuizType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사용 퀴즈 생성 요청 DTO")
public class CreateQuizRequest {

  // 어떤 로드맵 노드에 퀴즈를 연결할지 식별하는 노드 ID다.
  @NotNull
  @Schema(description = "로드맵 노드 ID", example = "1")
  private Long roadmapNodeId;

  // 강사가 작성한 퀴즈 제목이다.
  @NotBlank
  @Schema(description = "퀴즈 제목", example = "Spring Security 기초 퀴즈")
  private String title;

  // 퀴즈 설명 또는 안내 문구다.
  @Schema(description = "퀴즈 설명", example = "인증과 인가의 핵심 개념을 점검합니다.")
  private String description;

  // 수동 생성인지 AI 생성인지 퀴즈 유형을 지정한다.
  @NotNull
  @Schema(description = "퀴즈 유형", example = "MANUAL")
  private QuizType quizType;

  // 퀴즈 총점을 저장한다.
  @NotNull
  @Min(0)
  @Schema(description = "퀴즈 총점", example = "100")
  private Integer totalScore;

  // 생성 직후 바로 공개할지 여부다.
  @Schema(description = "공개 여부", example = "false")
  private Boolean isPublished;

  // 생성 직후 활성 상태로 둘지 여부다.
  @Schema(description = "활성 여부", example = "true")
  private Boolean isActive;

  // 응시 후 정답 노출 여부다.
  @Schema(description = "정답 공개 여부", example = "true")
  private Boolean exposeAnswer;

  // 응시 후 해설 노출 여부다.
  @Schema(description = "해설 공개 여부", example = "true")
  private Boolean exposeExplanation;

  @Builder
  public CreateQuizRequest(
      Long roadmapNodeId,
      String title,
      String description,
      QuizType quizType,
      Integer totalScore,
      Boolean isPublished,
      Boolean isActive,
      Boolean exposeAnswer,
      Boolean exposeExplanation) {
    this.roadmapNodeId = roadmapNodeId;
    this.title = title;
    this.description = description;
    this.quizType = quizType;
    this.totalScore = totalScore;
    this.isPublished = isPublished;
    this.isActive = isActive;
    this.exposeAnswer = exposeAnswer;
    this.exposeExplanation = exposeExplanation;
  }
}

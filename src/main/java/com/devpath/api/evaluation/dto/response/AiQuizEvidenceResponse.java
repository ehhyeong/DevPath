package com.devpath.api.evaluation.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "AI 퀴즈 생성 근거 구간 응답 DTO")
public class AiQuizEvidenceResponse {

  @Schema(description = "초안 ID", example = "1")
  private Long draftId;

  @Schema(description = "초안 제목", example = "Spring Security AI 초안 퀴즈")
  private String title;

  @Schema(
      description = "AI 생성 근거 원문",
      example = "Spring Security는 인증과 인가를 담당하는 프레임워크다.")
  private String sourceText;

  @Schema(description = "전체 근거 구간", example = "12:10-13:20")
  private String sourceTimestamp;

  @Schema(description = "문항별 근거 목록")
  private List<EvidenceItem> evidences = new ArrayList<>();

  @Builder
  public AiQuizEvidenceResponse(
      Long draftId,
      String title,
      String sourceText,
      String sourceTimestamp,
      List<EvidenceItem> evidences) {
    this.draftId = draftId;
    this.title = title;
    this.sourceText = sourceText;
    this.sourceTimestamp = sourceTimestamp;
    this.evidences = evidences == null ? new ArrayList<>() : evidences;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "문항별 근거 항목 DTO")
  public static class EvidenceItem {

    @Schema(description = "초안 문항 ID", example = "1")
    private Long draftQuestionId;

    @Schema(description = "문항 본문", example = "Spring Security의 핵심 역할은 무엇인가?")
    private String questionText;

    @Schema(
        description = "근거 발췌문",
        example = "Spring Security는 인증과 인가를 담당하는 프레임워크다.")
    private String evidenceExcerpt;

    @Schema(description = "근거 구간", example = "12:10-13:20")
    private String evidenceTimestamp;

    @Builder
    public EvidenceItem(
        Long draftQuestionId,
        String questionText,
        String evidenceExcerpt,
        String evidenceTimestamp) {
      this.draftQuestionId = draftQuestionId;
      this.questionText = questionText;
      this.evidenceExcerpt = evidenceExcerpt;
      this.evidenceTimestamp = evidenceTimestamp;
    }
  }
}

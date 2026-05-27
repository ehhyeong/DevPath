package com.devpath.api.meeting.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MeetingAiSummaryRequest {

  private MeetingAiSummaryRequest() {}

  @Schema(name = "MeetingAiSummarySaveRequest", description = "AI 회의 요약 저장 요청")
  public record Save(
      @Schema(hidden = true) Long requesterId,

      // 회의 전체 내용을 요약한 본문이다.
      @Schema(description = "회의 요약", example = "이번 회의에서는 멘토링 미션 진행 상황과 PR 리뷰 기준을 정리했습니다.")
          @NotBlank(message = "회의 요약은 필수입니다.")
          @Size(max = 5000, message = "회의 요약은 5000자 이하여야 합니다.")
          String summary,

      // 회의 이후 수행할 액션 아이템이다.
      @Schema(description = "액션 아이템", example = "1. PR 리뷰 반영\n2. 2주차 미션 제출\n3. Q&A 답변 확인")
          @Size(max = 5000, message = "액션 아이템은 5000자 이하여야 합니다.")
          String actionItems,

      // 회의에서 합의된 결정 사항이다.
      @Schema(description = "결정 사항", example = "2주차부터 PR 제출 시 테스트 결과를 함께 첨부하기로 결정했습니다.")
          @Size(max = 5000, message = "결정 사항은 5000자 이하여야 합니다.")
          String decisions) {}
}

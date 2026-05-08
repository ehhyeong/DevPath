package com.devpath.api.meeting.dto;

import com.devpath.domain.meeting.entity.MeetingAiSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(name = "MeetingAiSummaryResponse", description = "AI 회의 요약 응답")
public record MeetingAiSummaryResponse(
    @Schema(description = "AI 회의 요약 ID", example = "1") Long summaryId,
    @Schema(description = "회의방 ID", example = "1") Long meetingId,
    @Schema(description = "회의 제목", example = "1주차 멘토링 코드 리뷰 회의") String meetingTitle,
    @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
    @Schema(description = "요약 저장 요청자 ID", example = "1") Long createdByUserId,
    @Schema(description = "요약 저장 요청자 이름", example = "김멘토") String createdByUserName,
    @Schema(description = "회의 요약", example = "이번 회의에서는 멘토링 미션 진행 상황과 PR 리뷰 기준을 정리했습니다.")
        String summary,
    @Schema(description = "액션 아이템", example = "1. PR 리뷰 반영\n2. 2주차 미션 제출") String actionItems,
    @Schema(description = "결정 사항", example = "PR 제출 시 테스트 결과를 함께 첨부하기로 결정했습니다.") String decisions,
    @Schema(description = "최초 저장 일시", example = "2026-05-10T21:00:00") LocalDateTime createdAt,
    @Schema(description = "마지막 수정 일시", example = "2026-05-10T21:10:00") LocalDateTime updatedAt) {

  // AI 회의 요약 Entity를 API 응답 DTO로 변환한다.
  public static MeetingAiSummaryResponse from(MeetingAiSummary aiSummary) {
    return new MeetingAiSummaryResponse(
        aiSummary.getId(),
        aiSummary.getMeeting().getId(),
        aiSummary.getMeeting().getTitle(),
        aiSummary.getMeeting().getMentoring().getId(),
        aiSummary.getCreatedBy().getId(),
        aiSummary.getCreatedBy().getName(),
        aiSummary.getSummary(),
        aiSummary.getActionItems(),
        aiSummary.getDecisions(),
        aiSummary.getCreatedAt(),
        aiSummary.getUpdatedAt());
  }
}

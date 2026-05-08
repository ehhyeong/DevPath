package com.devpath.api.meeting.controller;

import com.devpath.api.meeting.dto.MeetingAiSummaryRequest;
import com.devpath.api.meeting.dto.MeetingAiSummaryResponse;
import com.devpath.api.meeting.service.MeetingAiSummaryService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.AI_MEETING_SUMMARY, description = "AI 회의 요약 API")
@RestController
@RequiredArgsConstructor
public class MeetingAiSummaryController {

  private final MeetingAiSummaryService meetingAiSummaryService;

  @PostMapping("/api/meetings/{meetingId}/ai-summary")
  @Operation(summary = "AI 회의 요약 저장", description = "회의 ID 기준으로 AI 회의 요약, 액션 아이템, 결정 사항을 저장합니다.")
  public ResponseEntity<ApiResponse<MeetingAiSummaryResponse>> saveSummary(
      @PathVariable Long meetingId, @Valid @RequestBody MeetingAiSummaryRequest.Save request) {
    // 같은 회의에 이미 요약이 있으면 기존 요약을 갱신한다.
    return ResponseEntity.ok(
        ApiResponse.ok(meetingAiSummaryService.saveSummary(meetingId, request)));
  }

  @GetMapping("/api/meetings/{meetingId}/ai-summary")
  @Operation(summary = "AI 회의 요약 조회", description = "회의 ID 기준으로 저장된 AI 회의 요약을 조회합니다.")
  public ResponseEntity<ApiResponse<MeetingAiSummaryResponse>> getSummary(
      @PathVariable Long meetingId) {
    // 회의에 저장된 최신 AI 요약을 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(meetingAiSummaryService.getSummary(meetingId)));
  }
}

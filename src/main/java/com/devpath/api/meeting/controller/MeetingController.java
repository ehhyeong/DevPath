package com.devpath.api.meeting.controller;

import com.devpath.api.meeting.dto.MeetingRequest;
import com.devpath.api.meeting.dto.MeetingResponse;
import com.devpath.api.meeting.service.MeetingService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.MEETING, description = "회의방, 참가, 출석, 녹화 URL API")
@RestController
@RequiredArgsConstructor
public class MeetingController {

  private final MeetingService meetingService;

  @PostMapping("/api/meetings")
  @Operation(summary = "회의방 생성", description = "멘토링 워크스페이스에 회의방을 생성합니다.")
  public ResponseEntity<ApiResponse<MeetingResponse.RoomDetail>> create(
      @Parameter(hidden = true) @AuthenticationPrincipal Long hostId,
      @Valid @RequestBody MeetingRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(ApiResponse.ok(meetingService.create(hostId, request)));
  }

  @PatchMapping("/api/meetings/{meetingId}/end")
  @Operation(summary = "회의 종료", description = "회의방을 종료 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<MeetingResponse.RoomDetail>> end(
      @PathVariable Long meetingId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long hostId,
      @Valid @RequestBody(required = false) MeetingRequest.End request) {
    // 종료 권한과 중복 종료 검증은 Service에서 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(meetingService.end(meetingId, hostId)));
  }

  @PostMapping("/api/meetings/{meetingId}/join")
  @Operation(summary = "회의 참가", description = "회의방에 참가하고 참가 이력을 저장합니다.")
  public ResponseEntity<ApiResponse<MeetingResponse.ParticipantDetail>> join(
      @PathVariable Long meetingId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody(required = false) MeetingRequest.Join request) {
    // 종료된 회의 재참가 방지와 중복 참가 검증은 Service에서 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(meetingService.join(meetingId, userId)));
  }

  @PostMapping("/api/meetings/{meetingId}/leave")
  @Operation(summary = "회의 퇴장", description = "회의방에서 퇴장하고 퇴장 시간을 저장합니다.")
  public ResponseEntity<ApiResponse<MeetingResponse.ParticipantDetail>> leave(
      @PathVariable Long meetingId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody(required = false) MeetingRequest.Leave request) {
    // 현재 참가 중인 사용자만 퇴장 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(meetingService.leave(meetingId, userId)));
  }

  @GetMapping("/api/meetings/{meetingId}/participants")
  @Operation(summary = "회의 참가자 목록 조회", description = "현재 회의방에 접속 중인 참가자 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MeetingResponse.ParticipantDetail>>> getParticipants(
      @PathVariable Long meetingId) {
    // 현재 active=true인 참가자만 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(meetingService.getParticipants(meetingId)));
  }

  @PatchMapping("/api/meetings/{meetingId}/recording-url")
  @Operation(summary = "회의 녹화 URL 저장", description = "회의 녹화 URL을 저장하거나 수정합니다.")
  public ResponseEntity<ApiResponse<MeetingResponse.RoomDetail>> updateRecordingUrl(
      @PathVariable Long meetingId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long hostId,
      @Valid @RequestBody MeetingRequest.RecordingUrl request) {
    // 녹화 URL 수정 권한은 Service에서 검증한다.
    return ResponseEntity.ok(
        ApiResponse.ok(meetingService.updateRecordingUrl(meetingId, hostId, request)));
  }

  @GetMapping("/api/meetings/{meetingId}/attendance")
  @Operation(summary = "회의 출석 조회", description = "회의 참가/퇴장 이력을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MeetingResponse.AttendanceDetail>>> getAttendance(
      @PathVariable Long meetingId) {
    // 참가/퇴장 이력을 입장 시간순으로 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(meetingService.getAttendance(meetingId)));
  }
}

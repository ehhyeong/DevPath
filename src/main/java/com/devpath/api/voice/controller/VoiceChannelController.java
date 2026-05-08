package com.devpath.api.voice.controller;

import com.devpath.api.voice.dto.VoiceRequest;
import com.devpath.api.voice.dto.VoiceResponse;
import com.devpath.api.voice.service.VoiceChannelService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.VOICE_CHANNEL, description = "보이스 채널 및 상태 이벤트 API")
@RestController
@RequiredArgsConstructor
public class VoiceChannelController {

  private final VoiceChannelService voiceChannelService;

  @PostMapping("/api/voice-channels")
  @Operation(summary = "보이스 채널 생성", description = "워크스페이스에 보이스 채널을 생성합니다.")
  public ResponseEntity<ApiResponse<VoiceResponse.ChannelDetail>> createChannel(
      @Valid @RequestBody VoiceRequest.ChannelCreate request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.createChannel(request)));
  }

  @GetMapping("/api/workspaces/{workspaceId}/voice-channels")
  @Operation(summary = "워크스페이스별 보이스 채널 조회", description = "워크스페이스에 속한 보이스 채널 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<VoiceResponse.ChannelSummary>>> getChannels(
      @PathVariable Long workspaceId) {
    // 워크스페이스 ID 기준으로 삭제되지 않은 보이스 채널을 조회한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.getChannels(workspaceId)));
  }

  @PostMapping("/api/voice-channels/{channelId}/join")
  @Operation(summary = "보이스 채널 참여", description = "사용자가 보이스 채널에 참여합니다.")
  public ResponseEntity<ApiResponse<VoiceResponse.ParticipantDetail>> join(
      @PathVariable Long channelId, @Valid @RequestBody VoiceRequest.Join request) {
    // 중복 참여 검증은 Service에서 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.join(channelId, request)));
  }

  @PostMapping("/api/voice-channels/{channelId}/leave")
  @Operation(summary = "보이스 채널 퇴장", description = "사용자가 보이스 채널에서 퇴장합니다.")
  public ResponseEntity<ApiResponse<VoiceResponse.ParticipantDetail>> leave(
      @PathVariable Long channelId, @Valid @RequestBody VoiceRequest.Leave request) {
    // 현재 참여 중인 사용자만 퇴장 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.leave(channelId, request)));
  }

  @PostMapping("/api/voice-channels/{channelId}/events")
  @Operation(summary = "보이스 상태 이벤트 저장", description = "음소거, 손들기, 발언 상태 이벤트를 저장합니다.")
  public ResponseEntity<ApiResponse<VoiceResponse.EventDetail>> createEvent(
      @PathVariable Long channelId, @Valid @RequestBody VoiceRequest.EventCreate request) {
    // 이벤트 저장과 참가자 현재 상태 갱신을 Service에서 함께 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.createEvent(channelId, request)));
  }
}

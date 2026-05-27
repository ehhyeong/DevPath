package com.devpath.api.voice.controller;

import com.devpath.api.voice.dto.VoiceRequest;
import com.devpath.api.voice.dto.VoiceResponse;
import com.devpath.api.voice.service.VoiceChannelService;
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

@Tag(name = SwaggerTag.VOICE_CHANNEL, description = "보이스 채널 및 상태 이벤트 API")
@RestController
@RequiredArgsConstructor
public class VoiceChannelController {

  private final VoiceChannelService voiceChannelService;

  @PostMapping("/api/voice-channels")
  @Operation(summary = "보이스 채널 생성", description = "워크스페이스에 보이스 채널을 생성합니다.")
  public ResponseEntity<ApiResponse<VoiceResponse.ChannelDetail>> createChannel(
      @Parameter(hidden = true) @AuthenticationPrincipal Long creatorId,
      @Valid @RequestBody VoiceRequest.ChannelCreate request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.createChannel(creatorId, request)));
  }

  @GetMapping("/api/workspaces/{workspaceId}/voice-channels")
  @Operation(summary = "워크스페이스별 보이스 채널 조회", description = "워크스페이스에 속한 보이스 채널 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<VoiceResponse.ChannelSummary>>> getChannels(
      @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    // 워크스페이스 ID 기준으로 삭제되지 않은 보이스 채널을 조회한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.getChannels(workspaceId, userId)));
  }

  @GetMapping("/api/voice-channels/{channelId}/participants")
  @Operation(
      summary = "Voice channel participants",
      description = "Returns active participants in a voice channel.")
  public ResponseEntity<ApiResponse<List<VoiceResponse.ParticipantDetail>>> getParticipants(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(voiceChannelService.getParticipants(channelId, userId)));
  }

  @GetMapping("/api/voice-channels/{channelId}/presence")
  @Operation(
      summary = "Voice waiting-room presence",
      description = "Returns users currently staying on the voice meeting page.")
  public ResponseEntity<ApiResponse<List<VoiceResponse.PresenceDetail>>> getPresence(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.getPresence(channelId, userId)));
  }

  @PostMapping("/api/voice-channels/{channelId}/presence")
  @Operation(
      summary = "Voice waiting-room heartbeat",
      description = "Updates the current user's voice meeting page presence.")
  public ResponseEntity<ApiResponse<VoiceResponse.PresenceDetail>> touchPresence(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.touchPresence(channelId, userId)));
  }

  @GetMapping("/api/voice-channels/{channelId}/chat-messages")
  @Operation(
      summary = "Voice meeting chat messages",
      description = "Returns chat messages for the voice meeting room.")
  public ResponseEntity<ApiResponse<List<VoiceResponse.ChatMessageDetail>>> getChatMessages(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(voiceChannelService.getChatMessages(channelId, userId)));
  }

  @PostMapping("/api/voice-channels/{channelId}/chat-messages")
  @Operation(
      summary = "Send voice meeting chat message",
      description = "Stores a chat message scoped to the voice meeting room.")
  public ResponseEntity<ApiResponse<VoiceResponse.ChatMessageDetail>> sendChatMessage(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody VoiceRequest.ChatMessageCreate request) {
    return ResponseEntity.ok(
        ApiResponse.ok(voiceChannelService.sendChatMessage(channelId, userId, request)));
  }

  @PostMapping("/api/voice-channels/{channelId}/chat-messages/clear")
  @Operation(
      summary = "Clear my voice meeting chat history",
      description = "Hides previous voice meeting chat messages for the current user only.")
  public ResponseEntity<ApiResponse<VoiceResponse.ChatClearStateDetail>> clearChatMessages(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(voiceChannelService.clearChatMessages(channelId, userId)));
  }

  @GetMapping("/api/voice-channels/{channelId}/minutes")
  @Operation(
      summary = "Voice meeting minutes",
      description = "Returns the AI minutes state for a voice meeting room.")
  public ResponseEntity<ApiResponse<VoiceResponse.MinutesDetail>> getMinutes(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.getMinutes(channelId, userId)));
  }

  @PatchMapping("/api/voice-channels/{channelId}/minutes")
  @Operation(
      summary = "Update voice meeting minutes",
      description = "Updates the AI minutes state for a voice meeting room.")
  public ResponseEntity<ApiResponse<VoiceResponse.MinutesDetail>> updateMinutes(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody VoiceRequest.MinutesUpdate request) {
    return ResponseEntity.ok(
        ApiResponse.ok(voiceChannelService.updateMinutes(channelId, userId, request)));
  }

  @PostMapping("/api/voice-channels/{channelId}/minutes/transcript-lines")
  @Operation(
      summary = "Append voice meeting transcript line",
      description = "Appends one speaker transcript line to the voice meeting minutes.")
  public ResponseEntity<ApiResponse<VoiceResponse.MinutesDetail>> appendMinutesTranscript(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody VoiceRequest.MinutesTranscriptAppend request) {
    return ResponseEntity.ok(
        ApiResponse.ok(voiceChannelService.appendMinutesTranscript(channelId, userId, request)));
  }

  @PostMapping("/api/voice-channels/{channelId}/minutes/summary")
  @Operation(
      summary = "Generate voice meeting summary",
      description = "Builds and stores a summary from the voice meeting minutes and chat.")
  public ResponseEntity<ApiResponse<VoiceResponse.MinutesAnalysisDetail>> generateMinutesSummary(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(voiceChannelService.generateMinutesSummary(channelId, userId)));
  }

  @PostMapping("/api/voice-channels/{channelId}/minutes/action-items/tasks")
  @Operation(
      summary = "Create Kanban tasks from voice meeting action items",
      description = "Creates workspace Kanban tasks from selected AI minutes action items.")
  public ResponseEntity<ApiResponse<VoiceResponse.MinutesKanbanTasksDetail>>
      createKanbanTasksFromMinutes(
          @PathVariable Long channelId,
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Valid @RequestBody VoiceRequest.MinutesActionItemsCreate request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            voiceChannelService.createKanbanTasksFromMinutes(channelId, userId, request)));
  }

  @PostMapping("/api/voice-channels/{channelId}/join")
  @Operation(summary = "보이스 채널 참여", description = "사용자가 보이스 채널에 참여합니다.")
  public ResponseEntity<ApiResponse<VoiceResponse.ParticipantDetail>> join(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody(required = false) VoiceRequest.Join request) {
    // 중복 참여 검증은 Service에서 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.join(channelId, userId)));
  }

  @PostMapping("/api/voice-channels/{channelId}/leave")
  @Operation(summary = "보이스 채널 퇴장", description = "사용자가 보이스 채널에서 퇴장합니다.")
  public ResponseEntity<ApiResponse<VoiceResponse.ParticipantDetail>> leave(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody(required = false) VoiceRequest.Leave request) {
    // 현재 참여 중인 사용자만 퇴장 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(voiceChannelService.leave(channelId, userId)));
  }

  @PostMapping("/api/voice-channels/{channelId}/events")
  @Operation(summary = "보이스 상태 이벤트 저장", description = "음소거, 손들기, 발언 상태 이벤트를 저장합니다.")
  public ResponseEntity<ApiResponse<VoiceResponse.EventDetail>> createEvent(
      @PathVariable Long channelId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long actorId,
      @Valid @RequestBody VoiceRequest.EventCreate request) {
    // 이벤트 저장과 참가자 현재 상태 갱신을 Service에서 함께 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(voiceChannelService.createEvent(channelId, actorId, request)));
  }
}

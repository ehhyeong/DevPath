package com.devpath.api.realtime.controller;

import com.devpath.api.realtime.dto.RealtimeMessageRequest;
import com.devpath.api.realtime.dto.RealtimeMessageResponse;
import com.devpath.api.realtime.service.RealtimeMessageService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import com.devpath.domain.realtime.entity.MessageSortOrder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.LOUNGE_CHAT, description = "라운지 채팅 REST API")
@Tag(name = SwaggerTag.DIRECT_MESSAGE, description = "사용자 간 1:1 메시지 REST API")
@RestController
@RequiredArgsConstructor
public class RealtimeMessageController {

  private final RealtimeMessageService realtimeMessageService;

  @PostMapping("/api/lounge/chats/messages")
  @Operation(
      tags = SwaggerTag.LOUNGE_CHAT,
      summary = "라운지 채팅 메시지 저장",
      description = "라운지 채팅 메시지를 저장합니다.")
  public ResponseEntity<ApiResponse<RealtimeMessageResponse.LoungeChatDetail>> createLoungeMessage(
      @Parameter(hidden = true) @AuthenticationPrincipal Long senderId,
      @Valid @RequestBody RealtimeMessageRequest.LoungeChatCreate request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(
        ApiResponse.ok(realtimeMessageService.createLoungeMessage(senderId, request)));
  }

  @GetMapping("/api/lounge/chats/messages")
  @Operation(
      tags = SwaggerTag.LOUNGE_CHAT,
      summary = "라운지 채팅 메시지 조회",
      description = "라운지 채팅 메시지를 오래된순 또는 최신순으로 조회합니다.")
  public ResponseEntity<ApiResponse<List<RealtimeMessageResponse.LoungeChatDetail>>>
      getLoungeMessages(
          @Parameter(description = "라운지 ID", example = "1") @RequestParam Long loungeId,
          @Parameter(hidden = true) @AuthenticationPrincipal Long viewerId,
          @Parameter(description = "정렬 기준", example = "OLDEST") @RequestParam(required = false)
              MessageSortOrder sort) {
    // viewerId 기준으로 각 메시지가 내가 보낸 메시지인지 계산한다.
    return ResponseEntity.ok(
        ApiResponse.ok(realtimeMessageService.getLoungeMessages(loungeId, viewerId, sort)));
  }

  @PostMapping("/api/direct-messages")
  @Operation(
      tags = SwaggerTag.DIRECT_MESSAGE,
      summary = "1:1 메시지 전송",
      description = "사용자 간 1:1 메시지를 저장합니다.")
  public ResponseEntity<ApiResponse<RealtimeMessageResponse.DirectDetail>> createDirectMessage(
      @Parameter(hidden = true) @AuthenticationPrincipal Long senderId,
      @Valid @RequestBody RealtimeMessageRequest.DirectCreate request) {
    // REST 저장 API는 이후 WebSocket Controller에서도 같은 Service를 재사용할 수 있다.
    return ResponseEntity.ok(
        ApiResponse.ok(realtimeMessageService.createDirectMessage(senderId, request)));
  }

  @GetMapping("/api/direct-messages/{userId}")
  @Operation(
      tags = SwaggerTag.DIRECT_MESSAGE,
      summary = "특정 사용자와의 1:1 메시지 조회",
      description = "viewerId와 userId 사이의 1:1 메시지를 조회합니다.")
  public ResponseEntity<ApiResponse<List<RealtimeMessageResponse.DirectDetail>>> getDirectMessages(
      @Parameter(description = "대화 상대 사용자 ID", example = "1") @PathVariable Long userId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long viewerId,
      @Parameter(description = "정렬 기준", example = "OLDEST") @RequestParam(required = false)
          MessageSortOrder sort) {
    // userId는 대화 상대, viewerId는 현재 조회자다.
    return ResponseEntity.ok(
        ApiResponse.ok(realtimeMessageService.getDirectMessages(userId, viewerId, sort)));
  }
}

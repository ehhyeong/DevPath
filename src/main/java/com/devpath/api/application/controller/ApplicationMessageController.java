package com.devpath.api.application.controller;

import com.devpath.api.application.dto.ApplicationMessageRequest;
import com.devpath.api.application.dto.ApplicationMessageResponse;
import com.devpath.api.application.service.ApplicationMessageService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.APPLICATION_MESSAGE, description = "라운지 신청 기반 메시지 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lounge/applications/{applicationId}/messages")
public class ApplicationMessageController {

  private final ApplicationMessageService applicationMessageService;

  @PostMapping
  @Operation(summary = "신청 메시지 작성", description = "라운지 신청에 메시지 또는 답장을 작성합니다.")
  public ResponseEntity<ApiResponse<ApplicationMessageResponse.Detail>> create(
      @PathVariable Long applicationId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long senderId,
      @Valid @RequestBody ApplicationMessageRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(
        ApiResponse.ok(applicationMessageService.create(applicationId, senderId, request)));
  }

  @GetMapping
  @Operation(summary = "신청 메시지 목록 조회", description = "라운지 신청에 연결된 메시지 목록을 생성순으로 조회합니다.")
  public ResponseEntity<ApiResponse<List<ApplicationMessageResponse.Detail>>> getMessages(
      @PathVariable Long applicationId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long viewerId) {
    // viewerId 기준으로 각 메시지가 내가 보낸 메시지인지 계산한다.
    return ResponseEntity.ok(
        ApiResponse.ok(applicationMessageService.getMessages(applicationId, viewerId)));
  }
}

package com.devpath.api.application.controller;

import com.devpath.api.application.dto.LoungeApplicationRequest;
import com.devpath.api.application.dto.LoungeApplicationResponse;
import com.devpath.api.application.service.LoungeApplicationService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.LOUNGE_APPLICATION, description = "라운지 신청서, 제안서, 승인/거절 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lounge/applications")
public class LoungeApplicationController {

  private final LoungeApplicationService loungeApplicationService;

  @PostMapping
  @Operation(summary = "라운지 신청 작성", description = "스쿼드 지원서 또는 제안서를 작성합니다.")
  public ResponseEntity<ApiResponse<LoungeApplicationResponse.Detail>> create(
      @Valid @RequestBody LoungeApplicationRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(ApiResponse.ok(loungeApplicationService.create(request)));
  }

  @GetMapping("/sent")
  @Operation(summary = "보낸 라운지 신청 조회", description = "내가 보낸 라운지 신청 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<LoungeApplicationResponse.Summary>>> getSentApplications(
      @RequestParam Long senderId) {
    // 인증 연동 전이므로 senderId query parameter로 보낸 신청을 조회한다.
    return ResponseEntity.ok(
        ApiResponse.ok(loungeApplicationService.getSentApplications(senderId)));
  }

  @GetMapping("/received")
  @Operation(summary = "받은 라운지 요청 조회", description = "내가 받은 라운지 요청 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<LoungeApplicationResponse.Summary>>>
      getReceivedApplications(@RequestParam Long receiverId) {
    // 인증 연동 전이므로 receiverId query parameter로 받은 요청을 조회한다.
    return ResponseEntity.ok(
        ApiResponse.ok(loungeApplicationService.getReceivedApplications(receiverId)));
  }

  @GetMapping("/{applicationId}")
  @Operation(summary = "라운지 신청 단건 조회", description = "라운지 신청 상세 정보를 조회합니다.")
  public ResponseEntity<ApiResponse<LoungeApplicationResponse.Detail>> getApplication(
      @PathVariable Long applicationId) {
    // Entity를 직접 반환하지 않고 상세 DTO로 변환된 결과를 반환한다.
    return ResponseEntity.ok(
        ApiResponse.ok(loungeApplicationService.getApplication(applicationId)));
  }

  @PatchMapping("/{applicationId}/approve")
  @Operation(summary = "라운지 신청 승인", description = "라운지 신청을 승인 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<LoungeApplicationResponse.Detail>> approve(
      @PathVariable Long applicationId,
      @Valid @RequestBody LoungeApplicationRequest.Approve request) {
    // 승인 권한과 중복 처리 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(loungeApplicationService.approve(applicationId, request)));
  }

  @PatchMapping("/{applicationId}/reject")
  @Operation(summary = "라운지 신청 거절", description = "라운지 신청을 거절 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<LoungeApplicationResponse.Detail>> reject(
      @PathVariable Long applicationId,
      @Valid @RequestBody LoungeApplicationRequest.Reject request) {
    // 거절 권한과 중복 처리 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(loungeApplicationService.reject(applicationId, request)));
  }

  @GetMapping("/{applicationId}/status")
  @Operation(summary = "라운지 신청 상태 조회", description = "라운지 신청의 현재 상태를 조회합니다.")
  public ResponseEntity<ApiResponse<LoungeApplicationResponse.Status>> getStatus(
      @PathVariable Long applicationId) {
    // 상태 추적에 필요한 최소 정보만 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(loungeApplicationService.getStatus(applicationId)));
  }
}

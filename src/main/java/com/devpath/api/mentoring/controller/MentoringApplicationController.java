package com.devpath.api.mentoring.controller;

import com.devpath.api.mentoring.dto.MentoringApplicationRequest;
import com.devpath.api.mentoring.dto.MentoringApplicationResponse;
import com.devpath.api.mentoring.service.MentoringApplicationService;
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

@Tag(name = SwaggerTag.MENTORING_APPLICATION, description = "멘토링 신청, 승인, 거절 API")
@RestController
@RequiredArgsConstructor
@RequestMapping
public class MentoringApplicationController {

  private final MentoringApplicationService mentoringApplicationService;

  @PostMapping("/api/mentoring-posts/{postId}/applications")
  @Operation(summary = "멘토링 신청", description = "멘토링 공고에 신청합니다.")
  public ResponseEntity<ApiResponse<MentoringApplicationResponse.Detail>> apply(
      @PathVariable Long postId, @Valid @RequestBody MentoringApplicationRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringApplicationService.apply(postId, request)));
  }

  @GetMapping("/api/mentoring-applications/sent")
  @Operation(summary = "보낸 멘토링 신청 조회", description = "내가 보낸 멘토링 신청 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MentoringApplicationResponse.Summary>>>
      getSentApplications(@RequestParam Long userId) {
    // 인증 연동 전이므로 userId query parameter로 보낸 신청을 조회한다.
    return ResponseEntity.ok(
        ApiResponse.ok(mentoringApplicationService.getSentApplications(userId)));
  }

  @GetMapping("/api/mentoring-applications/received")
  @Operation(summary = "받은 멘토링 신청 조회", description = "내 공고로 들어온 멘토링 신청 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MentoringApplicationResponse.Summary>>>
      getReceivedApplications(@RequestParam Long mentorId) {
    // 인증 연동 전이므로 mentorId query parameter로 받은 신청을 조회한다.
    return ResponseEntity.ok(
        ApiResponse.ok(mentoringApplicationService.getReceivedApplications(mentorId)));
  }

  @GetMapping("/api/mentoring-applications/{applicationId}/status")
  @Operation(summary = "멘토링 신청 상태 조회", description = "멘토링 신청의 현재 처리 상태를 조회합니다.")
  public ResponseEntity<ApiResponse<MentoringApplicationResponse.Status>> getStatus(
      @PathVariable Long applicationId) {
    // 신청 상태 추적에 필요한 최소 정보만 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringApplicationService.getStatus(applicationId)));
  }

  @PatchMapping("/api/mentoring-applications/{applicationId}/approve")
  @Operation(summary = "멘토링 신청 승인", description = "멘토링 신청을 승인하고 진행 중인 멘토링을 생성합니다.")
  public ResponseEntity<ApiResponse<MentoringApplicationResponse.Detail>> approve(
      @PathVariable Long applicationId,
      @Valid @RequestBody MentoringApplicationRequest.Approve request) {
    // 승인 성공 시 생성된 mentoringId를 응답에 포함한다.
    return ResponseEntity.ok(
        ApiResponse.ok(mentoringApplicationService.approve(applicationId, request)));
  }

  @PatchMapping("/api/mentoring-applications/{applicationId}/reject")
  @Operation(summary = "멘토링 신청 거절", description = "멘토링 신청을 거절 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<MentoringApplicationResponse.Detail>> reject(
      @PathVariable Long applicationId,
      @Valid @RequestBody MentoringApplicationRequest.Reject request) {
    // 거절은 Mentoring을 생성하지 않고 신청 상태만 REJECTED로 변경한다.
    return ResponseEntity.ok(
        ApiResponse.ok(mentoringApplicationService.reject(applicationId, request)));
  }
}

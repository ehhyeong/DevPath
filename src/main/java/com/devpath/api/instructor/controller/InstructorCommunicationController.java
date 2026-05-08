package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.communication.DmRoomCreateRequest;
import com.devpath.api.instructor.dto.communication.DmRoomResponse;
import com.devpath.api.instructor.dto.communication.UnansweredSummaryResponse;
import com.devpath.api.instructor.service.InstructorCommunicationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강사 - 소통", description = "강사 소통 API")
@RestController
@RequestMapping("/api/instructor/communications")
@RequiredArgsConstructor
public class InstructorCommunicationController {

  private final InstructorCommunicationService instructorCommunicationService;

  // 미답변 요약은 QnA와 리뷰 건수를 묶어서 내려준다.
  @Operation(summary = "미답변 Q&A/리뷰 요약 조회")
  @GetMapping("/unanswered-summary")
  public ApiResponse<UnansweredSummaryResponse> getUnansweredSummary(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "미답변 요약을 조회했습니다.", instructorCommunicationService.getUnansweredSummary(userId));
  }

  // DM 방 생성은 동일 pair가 이미 있으면 기존 방을 재사용한다.
  @Operation(summary = "수강생 DM 방 생성")
  @PostMapping("/dm-rooms")
  public ApiResponse<DmRoomResponse> createDmRoom(
      @RequestBody @Valid DmRoomCreateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "DM 방이 생성되었습니다.", instructorCommunicationService.createDmRoom(userId, request));
  }

  // 방 조회 시 메시지 목록까지 함께 조회한다.
  @Operation(summary = "DM 방 조회")
  @GetMapping("/dm-rooms/{roomId}")
  public ApiResponse<DmRoomResponse> getDmRoom(
      @PathVariable Long roomId, @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "DM 방을 조회했습니다.", instructorCommunicationService.getDmRoom(roomId, userId));
  }
}

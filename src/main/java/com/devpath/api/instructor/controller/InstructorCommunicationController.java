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
import org.springframework.web.bind.annotation.*;

@Tag(name = "Instructor - Communication", description = "강사 소통 API")
@RestController
@RequestMapping("/api/instructor/communications")
@RequiredArgsConstructor
public class InstructorCommunicationController {

    private final InstructorCommunicationService instructorCommunicationService;

    @Operation(summary = "미답변 Q&A/리뷰 요약 조회")
    @GetMapping("/unanswered-summary")
    public ApiResponse<UnansweredSummaryResponse> getUnansweredSummary(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("미답변 요약을 조회했습니다.", instructorCommunicationService.getUnansweredSummary(userId));
    }

    @Operation(summary = "수강생 DM 방 생성")
    @PostMapping("/dm-rooms")
    public ApiResponse<DmRoomResponse> createDmRoom(
            @RequestBody @Valid DmRoomCreateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("DM 방이 생성되었습니다.", instructorCommunicationService.createDmRoom(userId, request));
    }

    @Operation(summary = "DM 방 조회")
    @GetMapping("/dm-rooms/{roomId}")
    public ApiResponse<DmRoomResponse> getDmRoom(
            @PathVariable Long roomId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("DM 방을 조회했습니다.", instructorCommunicationService.getDmRoom(roomId, userId));
    }
}
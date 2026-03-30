package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.subscription.SubscriptionRequest;
import com.devpath.api.instructor.dto.subscription.SubscriptionResponse;
import com.devpath.api.instructor.service.InstructorSubscriptionService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Instructor - Subscription", description = "강사 채널 구독 API")
@RestController
@RequestMapping("/api/instructor/subscriptions")
@RequiredArgsConstructor
public class InstructorSubscriptionController {

    private final InstructorSubscriptionService instructorSubscriptionService;

    @Operation(summary = "채널 팔로우")
    @PostMapping
    public ApiResponse<SubscriptionResponse> subscribe(
            @RequestBody @Valid SubscriptionRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("채널을 팔로우했습니다.",
                instructorSubscriptionService.subscribe(request.getChannelId(), userId));
    }

    @Operation(summary = "채널 언팔로우")
    @DeleteMapping("/{channelId}")
    public ApiResponse<Void> unsubscribe(
            @PathVariable Long channelId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorSubscriptionService.unsubscribe(channelId, userId);
        return ApiResponse.success("채널 팔로우를 취소했습니다.", null);
    }

    @Operation(summary = "구독 알림 on/off 설정")
    @PatchMapping("/{channelId}/notification")
    public ApiResponse<Void> updateNotification(
            @PathVariable Long channelId,
            @Parameter(description = "알림 활성화 여부") @RequestParam boolean notificationEnabled,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorSubscriptionService.updateNotification(channelId, userId, notificationEnabled);
        return ApiResponse.success("알림 설정이 변경되었습니다.", null);
    }
}
package com.devpath.api.notification.controller;

import com.devpath.api.notification.dto.NotificationResponse;
import com.devpath.api.notification.service.LearnerNotificationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Learner - Notification", description = "학습자 알림 센터 API")
public class LearnerNotificationController {

    private final LearnerNotificationService notificationService;

    @GetMapping
    @Operation(summary = "알림 목록 조회", description = "내 알림 목록을 최신순으로 조회합니다.")
    public ApiResponse<List<NotificationResponse>> getMyNotifications(
            @RequestParam(defaultValue = "1") Long learnerId
    ) {
        return ApiResponse.ok(notificationService.getMyNotifications(learnerId));
    }

    @PatchMapping("/{notificationId}/read")
    @Operation(summary = "알림 읽음 처리", description = "특정 알림을 읽음 상태로 변경합니다.")
    public ApiResponse<Void> markAsRead(
            @PathVariable Long notificationId,
            @RequestParam(defaultValue = "1") Long learnerId
    ) {
        notificationService.markAsRead(learnerId, notificationId);
        return ApiResponse.ok(null);
    }
}

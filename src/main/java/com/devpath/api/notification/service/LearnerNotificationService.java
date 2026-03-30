package com.devpath.api.notification.service;

import com.devpath.api.notification.dto.NotificationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.notification.entity.LearnerNotification;
import com.devpath.domain.notification.repository.LearnerNotificationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerNotificationService {

    private final LearnerNotificationRepository notificationRepository;

    public List<NotificationResponse> getMyNotifications(Long learnerId) {
        return notificationRepository.findAllByLearnerIdOrderByCreatedAtDesc(learnerId).stream()
                .map(this::convertToDto)
                .toList();
    }

    @Transactional
    public void markAsRead(Long learnerId, Long notificationId) {
        LearnerNotification notification = notificationRepository.findByIdAndLearnerId(notificationId, learnerId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "본인의 알림만 읽음 처리할 수 있습니다."));

        notification.markAsRead();
    }

    private NotificationResponse convertToDto(LearnerNotification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .message(notification.getMessage())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}

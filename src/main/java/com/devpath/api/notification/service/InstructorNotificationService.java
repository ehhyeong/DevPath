package com.devpath.api.notification.service;

import com.devpath.api.notification.dto.InstructorNotificationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.notification.entity.InstructorNotification;
import com.devpath.domain.notification.repository.InstructorNotificationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorNotificationService {

  private final InstructorNotificationRepository instructorNotificationRepository;

  public List<InstructorNotificationResponse> getNotifications(Long instructorId) {
    return instructorNotificationRepository
        .findAllByInstructorIdOrderByCreatedAtDesc(instructorId)
        .stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public void markAsRead(Long instructorId, Long notificationId) {
    InstructorNotification notification =
        instructorNotificationRepository
            .findByIdAndInstructorId(notificationId, instructorId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    notification.markAsRead();
  }

  @Transactional
  public void deleteNotification(Long instructorId, Long notificationId) {
    InstructorNotification notification =
        instructorNotificationRepository
            .findByIdAndInstructorId(notificationId, instructorId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    instructorNotificationRepository.delete(notification);
  }

  // 강사 전용 알림 엔티티를 응답 DTO로 변환한다.
  private InstructorNotificationResponse toResponse(InstructorNotification notification) {
    return InstructorNotificationResponse.builder()
        .notificationId(notification.getId())
        .type(notification.getType() == null ? null : notification.getType().name())
        .message(notification.getMessage())
        .isRead(notification.getIsRead())
        .createdAt(notification.getCreatedAt())
        .build();
  }
}

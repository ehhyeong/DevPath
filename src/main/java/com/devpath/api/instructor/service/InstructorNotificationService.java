package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.notification.NotificationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.notification.entity.InstructorNotification;
import com.devpath.domain.notification.entity.InstructorNotificationType;
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

  public List<NotificationResponse> getNotifications(Long instructorId) {
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
  public void notifySubscribe(Long instructorId, String subscriberName) {
    notify(instructorId, InstructorNotificationType.SUBSCRIBE, subscriberName + "님이 채널을 구독했습니다.");
  }

  @Transactional
  public void notifyReview(Long instructorId, String courseName) {
    notify(instructorId, InstructorNotificationType.REVIEW, "새 수강평이 등록되었습니다: " + courseName);
  }

  @Transactional
  public void notifyQna(Long instructorId, String questionTitle) {
    notify(instructorId, InstructorNotificationType.QNA, "새 Q&A 질문이 등록되었습니다: " + questionTitle);
  }

  @Transactional
  public void notifyMentoringApplication(
      Long instructorId, String postTitle, String applicantName) {
    notify(
        instructorId,
        InstructorNotificationType.MENTORING_APPLICATION,
        applicantName + "님이 멘토링에 신청했습니다: " + postTitle);
  }

  @Transactional
  public void notifySystem(Long instructorId, String message) {
    notify(instructorId, InstructorNotificationType.SYSTEM, message);
  }

  @Transactional
  public void deleteNotification(Long instructorId, Long notificationId) {
    InstructorNotification notification =
        instructorNotificationRepository
            .findByIdAndInstructorId(notificationId, instructorId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    instructorNotificationRepository.delete(notification);
  }

  private void notify(Long instructorId, InstructorNotificationType type, String message) {
    if (instructorId == null || message == null || message.isBlank()) {
      return;
    }

    instructorNotificationRepository.save(
        InstructorNotification.builder()
            .instructorId(instructorId)
            .type(type)
            .message(message)
            .build());
  }

  // 강사 전용 알림 엔티티를 응답 DTO로 변환한다.
  private NotificationResponse toResponse(InstructorNotification notification) {
    return NotificationResponse.builder()
        .notificationId(notification.getId())
        .type(notification.getType() == null ? null : notification.getType().name())
        .message(notification.getMessage())
        .isRead(notification.getIsRead())
        .createdAt(notification.getCreatedAt())
        .build();
  }
}

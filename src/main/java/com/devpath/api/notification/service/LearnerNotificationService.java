package com.devpath.api.notification.service;

import com.devpath.api.notification.dto.NotificationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.notification.entity.LearnerNotification;
import com.devpath.domain.notification.repository.LearnerNotificationRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerNotificationService {

  private final LearnerNotificationRepository learnerNotificationRepository;
  private final UserRepository userRepository;

  public List<NotificationResponse> getMyNotifications(Long learnerId) {
    validateUserExists(learnerId);

    return learnerNotificationRepository.findAllByLearnerIdOrderByCreatedAtDesc(learnerId).stream()
        .map(NotificationResponse::from)
        .toList();
  }

  @Transactional
  public NotificationResponse markAsRead(Long learnerId, Long notificationId) {
    LearnerNotification notification =
        learnerNotificationRepository
            .findByIdAndLearnerId(notificationId, learnerId)
            .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));

    notification.markAsRead();

    return NotificationResponse.from(notification);
  }

  private void validateUserExists(Long userId) {
    if (!userRepository.existsById(userId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }
}

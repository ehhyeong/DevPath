package com.devpath.api.notification.service;

import com.devpath.api.notification.dto.NotificationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.notification.entity.LearnerNotification;
import com.devpath.domain.notification.entity.LearnerNotificationType;
import com.devpath.domain.notification.repository.LearnerNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class NotificationEventService {

  private final LearnerNotificationRepository learnerNotificationRepository;
  private final NotificationSseService notificationSseService;

  @Transactional
  public NotificationResponse notifySystem(Long receiverId, String message) {
    return notify(receiverId, LearnerNotificationType.SYSTEM, message);
  }

  @Transactional
  public NotificationResponse notifyMentoringAnswerCreated(Long receiverId, String questionTitle) {
    return notify(
        receiverId,
        LearnerNotificationType.MENTORING_ANSWER_CREATED,
        "멘토링 질문에 답변이 등록되었습니다: " + questionTitle);
  }

  @Transactional
  public NotificationResponse notifyWorkspaceAnswerCreated(Long receiverId, String questionTitle) {
    return notify(
        receiverId,
        LearnerNotificationType.WORKSPACE_ANSWER_CREATED,
        "워크스페이스 질문에 답변이 등록되었습니다: " + questionTitle);
  }

  @Transactional
  public NotificationResponse notifyPrReviewCreated(Long receiverId, String pullRequestTitle) {
    return notify(
        receiverId,
        LearnerNotificationType.PR_REVIEW_CREATED,
        "PR 리뷰가 등록되었습니다: " + pullRequestTitle);
  }

  @Transactional
  public NotificationResponse notifyApplicationApproved(Long receiverId, String title) {
    return notify(
        receiverId, LearnerNotificationType.APPLICATION_APPROVED, "신청이 승인되었습니다: " + title);
  }

  @Transactional
  public NotificationResponse notifyApplicationRejected(Long receiverId, String title) {
    return notify(
        receiverId, LearnerNotificationType.APPLICATION_REJECTED, "신청이 거절되었습니다: " + title);
  }

  private NotificationResponse notify(
      Long receiverId, LearnerNotificationType type, String message) {
    validateNotification(receiverId, type, message);

    LearnerNotification notification =
        LearnerNotification.builder().learnerId(receiverId).type(type).message(message).build();

    LearnerNotification savedNotification = learnerNotificationRepository.save(notification);
    NotificationResponse response = NotificationResponse.from(savedNotification);

    notificationSseService.send(receiverId, response);

    return response;
  }

  private void validateNotification(Long receiverId, LearnerNotificationType type, String message) {
    if (receiverId == null || receiverId <= 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "receiverId is required.");
    }

    if (type == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "notification type is required.");
    }

    if (!StringUtils.hasText(message)) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "notification message is required.");
    }
  }
}

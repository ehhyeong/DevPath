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

  @Transactional
  public NotificationResponse notifySquadInvited(Long receiverId, String squadName) {
    return notify(
        receiverId, LearnerNotificationType.SQUAD_INVITED, "Squad 초대가 도착했습니다: " + squadName);
  }

  @Transactional
  public NotificationResponse notifySquadKicked(Long receiverId, String squadName) {
    return notify(
        receiverId, LearnerNotificationType.SQUAD_KICKED, "Squad에서 강제 퇴장되었습니다: " + squadName);
  }

  @Transactional
  public NotificationResponse notifyAssignmentGraded(
      Long receiverId, String assignmentTitle, int score) {
    return notify(
        receiverId,
        LearnerNotificationType.ASSIGNMENT_GRADED,
        "과제가 채점되었습니다: " + assignmentTitle + " (" + score + "점)");
  }

  @Transactional
  public NotificationResponse notifyMissionPassed(Long receiverId, String missionTitle) {
    return notify(
        receiverId, LearnerNotificationType.MISSION_PASSED, "멘토링 미션이 통과되었습니다: " + missionTitle);
  }

  @Transactional
  public NotificationResponse notifyMissionRejected(Long receiverId, String missionTitle) {
    return notify(
        receiverId, LearnerNotificationType.MISSION_REJECTED, "멘토링 미션이 반려되었습니다: " + missionTitle);
  }

  @Transactional
  public NotificationResponse notifyRecommendationArrived(Long receiverId, int count) {
    return notify(
        receiverId,
        LearnerNotificationType.RECOMMENDATION_ARRIVED,
        "새 AI 로드맵 추천 " + count + "개가 도착했습니다.");
  }

  @Transactional
  public NotificationResponse notifyLoungeApplicationReceived(
      Long receiverId, String senderName, String title) {
    return notify(
        receiverId,
        LearnerNotificationType.LOUNGE_APPLICATION_RECEIVED,
        senderName + "님이 신청서를 보냈습니다: " + title);
  }

  @Transactional
  public NotificationResponse notifyCommunityCommented(Long receiverId, String postTitle) {
    return notify(
        receiverId,
        LearnerNotificationType.COMMUNITY_COMMENTED,
        "내 게시글에 댓글이 달렸습니다: " + postTitle);
  }

  @Transactional
  public NotificationResponse notifyRefundProcessed(Long receiverId, boolean approved) {
    String message = approved ? "환불 신청이 승인되었습니다." : "환불 신청이 반려되었습니다.";
    return notify(receiverId, LearnerNotificationType.REFUND_PROCESSED, message);
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

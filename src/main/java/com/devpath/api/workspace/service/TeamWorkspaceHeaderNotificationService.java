package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.MentoringHeaderNotificationResponse;
import com.devpath.api.workspace.dto.TeamWorkspaceHeaderNotificationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.TeamWorkspaceHeaderNotification;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.repository.TeamWorkspaceHeaderNotificationRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeamWorkspaceHeaderNotificationService {

  private static final int REAL_NOTIFICATION_ORDER = -100;
  private static final int MAX_MESSAGE_LENGTH = 500;

  private final TeamWorkspaceHeaderNotificationRepository notificationRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final UserRepository userRepository;

  @Transactional
  public List<TeamWorkspaceHeaderNotificationResponse> getNotifications(
      Long workspaceId, String page, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    String pageKey = normalizePage(page);
    deleteLegacyDefaultNotifications(workspaceId, pageKey);

    return notificationRepository
        .findByWorkspaceIdAndPageKeyAndIsDeletedFalseOrderByDisplayOrderAscCreatedAtDesc(
            workspaceId, pageKey)
        .stream()
        .map(TeamWorkspaceHeaderNotificationResponse::from)
        .toList();
  }

  @Transactional
  public List<MentoringHeaderNotificationResponse> getMentoringNotifications(
      Long workspaceId, String page, Long userId) {
    Workspace workspace = getWorkspace(workspaceId);
    validateMember(workspaceId, userId);

    String pageKey = normalizeMentoringPage(page);
    List<MentoringHeaderNotificationResponse> savedNotifications =
        notificationRepository
            .findByWorkspaceIdAndPageKeyAndIsDeletedFalseOrderByDisplayOrderAscCreatedAtDesc(
                workspaceId, pageKey)
            .stream()
            .map(MentoringHeaderNotificationResponse::from)
            .toList();

    if (!savedNotifications.isEmpty()) {
      return savedNotifications;
    }

    return defaultMentoringNotifications(workspace, pageKey);
  }

  @Transactional
  public List<TeamWorkspaceHeaderNotificationResponse> getSquadNotifications(
      Long workspaceId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    return notificationRepository
        .findByWorkspaceIdAndPageKeyStartingWithAndIsDeletedFalseOrderByDisplayOrderAscCreatedAtDesc(
            workspaceId, "squad-")
        .stream()
        .map(TeamWorkspaceHeaderNotificationResponse::from)
        .toList();
  }

  @Transactional
  public void addNotification(Long workspaceId, String page, String message, String targetPath) {
    saveNotification(workspaceId, normalizePage(page), normalizeMessage(message), targetPath);
  }

  @Transactional
  public TeamWorkspaceHeaderNotificationResponse addSquadNotification(
      Long workspaceId, String page, String message, String targetPath, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    return TeamWorkspaceHeaderNotificationResponse.from(
        saveNotification(workspaceId, normalizeSquadPage(page), normalizeMessage(message), targetPath));
  }

  @Transactional
  public void clearSquadNotifications(Long workspaceId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    notificationRepository
        .findByWorkspaceIdAndPageKeyStartingWithAndIsDeletedFalseOrderByDisplayOrderAscCreatedAtDesc(
            workspaceId, "squad-")
        .forEach(TeamWorkspaceHeaderNotification::delete);
  }

  private TeamWorkspaceHeaderNotification saveNotification(
      Long workspaceId, String pageKey, String message, String targetPath) {
    return notificationRepository.save(
        TeamWorkspaceHeaderNotification.builder()
            .workspaceId(workspaceId)
            .pageKey(pageKey)
            .message(message)
            .timeLabel("방금 전")
            .targetPath(targetPath)
            .displayOrder(REAL_NOTIFICATION_ORDER)
            .build());
  }

  private void deleteLegacyDefaultNotifications(Long workspaceId, String pageKey) {
    notificationRepository
        .findByWorkspaceIdAndPageKeyAndIsDeletedFalse(workspaceId, pageKey)
        .stream()
        .filter(notification -> notification.getDisplayOrder() >= 0)
        .forEach(TeamWorkspaceHeaderNotification::delete);
  }

  private String normalizePage(String page) {
    if (page == null || page.isBlank()) {
      return "dashboard";
    }

    return page.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeSquadPage(String page) {
    String pageKey = normalizePage(page);
    return pageKey.startsWith("squad-") ? pageKey : "squad-" + pageKey;
  }

  private String normalizeMentoringPage(String page) {
    String pageKey = normalizePage(page);
    return pageKey.startsWith("mentoring-") ? pageKey : "mentoring-" + pageKey;
  }

  private List<MentoringHeaderNotificationResponse> defaultMentoringNotifications(
      Workspace workspace, String pageKey) {
    String mentorName =
        userRepository.findById(workspace.getOwnerId()).map(User::getName).orElse("코드마스터 J");
    if (mentorName == null || mentorName.isBlank()) {
      mentorName = "코드마스터 J";
    }

    return switch (pageKey) {
      case "mentoring-dashboard" ->
          List.of(
              MentoringHeaderNotificationResponse.builder()
                  .id(-1L)
                  .workspaceId(workspace.getId())
                  .pageKey(pageKey)
                  .message("🎉 " + mentorName + "님이 2주차 과제에 대한 리뷰를 남겼습니다.")
                  .highlightText(mentorName)
                  .actionLabel("피드백 확인하기")
                  .timeLabel("방금 전")
                  .targetPath("/mentoring-curriculum")
                  .build(),
              MentoringHeaderNotificationResponse.builder()
                  .id(-2L)
                  .workspaceId(workspace.getId())
                  .pageKey(pageKey)
                  .message("🚨 멘토 공지사항이 새로 등록되었습니다.")
                  .highlightText("멘토 공지사항")
                  .timeLabel("1시간 전")
                  .modalTitle("이번 주 라이브 밋업 시간 변경 안내")
                  .modalBody("이번 주 목요일 밋업이 금요일로 변경되었습니다.")
                  .build());
      case "mentoring-qna" ->
          List.of(
              MentoringHeaderNotificationResponse.builder()
                  .id(-3L)
                  .workspaceId(workspace.getId())
                  .pageKey(pageKey)
                  .message("🎉 " + mentorName + "님이 내 질문에 답변을 남겼습니다.")
                  .highlightText(mentorName)
                  .timeLabel("방금 전")
                  .targetPath("/mentoring-qna")
                  .build());
      default -> List.of();
    };
  }

  private String normalizeMessage(String message) {
    if (message == null || message.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "notification message is required.");
    }

    String trimmed = message.trim();
    return trimmed.length() > MAX_MESSAGE_LENGTH
        ? trimmed.substring(0, MAX_MESSAGE_LENGTH)
        : trimmed;
  }

  private void validateWorkspaceExists(Long workspaceId) {
    getWorkspace(workspaceId);
  }

  private Workspace getWorkspace(Long workspaceId) {
    return workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateMember(Long workspaceId, Long userId) {
    if (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      return;
    }
    if (workspaceRepository.existsByIdAndOwnerIdAndIsDeletedFalse(workspaceId, userId)) {
      return;
    }
    throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
  }
}

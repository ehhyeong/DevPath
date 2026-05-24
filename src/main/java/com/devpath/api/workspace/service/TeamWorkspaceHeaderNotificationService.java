package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.TeamWorkspaceHeaderNotificationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.TeamWorkspaceHeaderNotification;
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

  private final TeamWorkspaceHeaderNotificationRepository notificationRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;

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
  public void addNotification(Long workspaceId, String page, String message, String targetPath) {
    notificationRepository.save(
        TeamWorkspaceHeaderNotification.builder()
            .workspaceId(workspaceId)
            .pageKey(normalizePage(page))
            .message(message)
            .timeLabel("방금 전")
            .targetPath(targetPath)
            .displayOrder(REAL_NOTIFICATION_ORDER)
            .build());
  }

  private void deleteLegacyDefaultNotifications(Long workspaceId, String pageKey) {
    notificationRepository.findByWorkspaceIdAndPageKeyAndIsDeletedFalse(workspaceId, pageKey)
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

  private void validateWorkspaceExists(Long workspaceId) {
    workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateMember(Long workspaceId, Long userId) {
    if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }
}

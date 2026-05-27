package com.devpath.api.lounge.service;

import com.devpath.api.lounge.dto.LoungeShellResponse;
import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.service.WorkspaceHubProjectService;
import com.devpath.domain.application.repository.LoungeApplicationRepository;
import com.devpath.domain.notification.repository.LearnerNotificationRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoungeShellService {

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final WorkspaceHubProjectService workspaceHubProjectService;
  private final LoungeApplicationRepository loungeApplicationRepository;
  private final LearnerNotificationRepository learnerNotificationRepository;

  public LoungeShellResponse.Shell getShell(Long userId) {
    if (userId == null) {
      return new LoungeShellResponse.Shell(
          LoungeShellResponse.CurrentUser.anonymous(), menu(), List.of(), List.of(), List.of());
    }

    User user = userRepository.findById(userId).orElse(null);
    if (user == null) {
      return new LoungeShellResponse.Shell(
          LoungeShellResponse.CurrentUser.anonymous(), menu(), List.of(), List.of(), List.of());
    }

    UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);

    return new LoungeShellResponse.Shell(
        LoungeShellResponse.CurrentUser.from(user, profile),
        menu(),
        toMyWorkspaceProjects(userId),
        loungeApplicationRepository
            .findAllByReceiver_IdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
            .stream()
            .limit(30)
            .map(application -> LoungeShellResponse.MessageItem.from(application, userId))
            .toList(),
        learnerNotificationRepository
            .findAllByLearnerIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
            .stream()
            .limit(30)
            .map(LoungeShellResponse.NotificationItem::from)
            .toList());
  }

  private List<LoungeShellResponse.MySquad> toMyWorkspaceProjects(Long userId) {
    return workspaceHubProjectService.getProjects(userId).stream()
        .map(
            project ->
                new LoungeShellResponse.MySquad(
                    project.getProjectId(),
                    project.getTitle(),
                    workspaceColor(project),
                    project.getDashboardUrl()))
        .toList();
  }

  private String workspaceColor(WorkspaceHubProjectResponse project) {
    if ("mentoring".equals(project.getType())) {
      return "bg-purple-500";
    }
    if ("solo".equals(project.getType())) {
      return "bg-emerald-500";
    }
    return "bg-blue-500";
  }

  private List<LoungeShellResponse.NavItem> menu() {
    return List.of(
        new LoungeShellResponse.NavItem(
            "dashboard", "lounge-dashboard.html", "대시보드", "fa-home", false),
        new LoungeShellResponse.NavItem(
            "lounge", "community-lounge.html", "라운지 (팀 찾기)", "fa-rocket", false),
        new LoungeShellResponse.NavItem(
            "mentoring", "mentoring-hub.html", "멘토링 찾기", "fa-chalkboard-teacher", false),
        new LoungeShellResponse.NavItem(
            "workspace", "workspace-hub.html", "워크스페이스", "fa-laptop-code", false),
        new LoungeShellResponse.NavItem(
            "showcase", "dev-showcase.html", "성과 쇼케이스", "fa-trophy", false));
  }
}

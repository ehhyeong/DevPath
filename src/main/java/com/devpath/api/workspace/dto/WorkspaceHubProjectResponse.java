package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.WorkspaceHubProject;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkspaceHubProjectResponse {

  private Long projectId;
  private String domId;
  private String menuId;
  private String type;
  private String status;
  private String dashboardUrl;
  private String title;
  private String description;
  private int progressPercent;
  private String mentoringModeLabel;
  private String mentoringModeIcon;
  private String categoryLabel;
  private String roleLabel;
  private String footerKind;
  private String footerDateLabel;
  private List<String> memberAvatarSeeds;
  private Integer extraMemberCount;
  private String footerAvatarSeed;
  private String footerText;
  private String footerMetaText;
  private String footerMetaIcon;

  public static WorkspaceHubProjectResponse from(WorkspaceHubProject project) {
    return WorkspaceHubProjectResponse.builder()
        .projectId(project.getId())
        .domId(project.getDomId())
        .menuId(project.getMenuId())
        .type(project.getType())
        .status(project.getStatus())
        .dashboardUrl(project.getDashboardUrl())
        .title(project.getTitle())
        .description(project.getDescription())
        .progressPercent(project.getProgressPercent())
        .mentoringModeLabel(project.getMentoringModeLabel())
        .mentoringModeIcon(project.getMentoringModeIcon())
        .categoryLabel(project.getCategoryLabel())
        .roleLabel(project.getRoleLabel())
        .footerKind(project.getFooterKind())
        .footerDateLabel(project.getFooterDateLabel())
        .memberAvatarSeeds(parseSeeds(project.getMemberAvatarSeeds()))
        .extraMemberCount(project.getExtraMemberCount())
        .footerAvatarSeed(project.getFooterAvatarSeed())
        .footerText(project.getFooterText())
        .footerMetaText(project.getFooterMetaText())
        .footerMetaIcon(project.getFooterMetaIcon())
        .build();
  }

  public static WorkspaceHubProjectResponse fromWorkspace(
      Workspace workspace, List<WorkspaceMember> members, Long currentUserId) {
    String type = typeOf(workspace.getType());
    String status = statusOf(workspace.getStatus());
    String mentoringModeLabel = mentoringModeLabel(workspace);

    return WorkspaceHubProjectResponse.builder()
        .projectId(workspace.getId())
        .domId("workspace-" + workspace.getId())
        .menuId("workspace-menu-" + workspace.getId())
        .type(type)
        .status(status)
        .dashboardUrl(dashboardUrl(workspace))
        .title(workspace.getName())
        .description(workspace.getDescription() == null ? "" : workspace.getDescription())
        .progressPercent("completed".equals(status) ? 100 : defaultProgress(workspace.getType()))
        .mentoringModeLabel(mentoringModeLabel)
        .mentoringModeIcon(mentoringModeIcon(mentoringModeLabel))
        .categoryLabel(workspace.getType() == WorkspaceType.MENTORING ? "Mentoring" : null)
        .roleLabel(null)
        .footerKind(workspace.getType() == WorkspaceType.MENTORING ? "mentor" : "avatars")
        .footerDateLabel(dateText(workspace.getCreatedAt()))
        .memberAvatarSeeds(memberSeeds(members, currentUserId))
        .extraMemberCount(extraMemberCount(members))
        .footerAvatarSeed(workspace.getType() == WorkspaceType.MENTORING ? "workspace-" + workspace.getId() : null)
        .footerText(workspace.getType() == WorkspaceType.MENTORING ? "멘토링 워크스페이스" : null)
        .footerMetaText(workspace.getType() == WorkspaceType.MENTORING ? "진행중" : null)
        .footerMetaIcon(workspace.getType() == WorkspaceType.MENTORING ? "fas fa-comment-dots mr-1" : null)
        .build();
  }

  private static List<String> parseSeeds(String seeds) {
    if (seeds == null || seeds.isBlank()) {
      return List.of();
    }

    return Arrays.stream(seeds.split(",")).map(String::trim).filter(seed -> !seed.isBlank()).toList();
  }

  private static String typeOf(WorkspaceType type) {
    if (type == WorkspaceType.SOLO) {
      return "solo";
    }
    if (type == WorkspaceType.MENTORING) {
      return "mentoring";
    }
    return "squad";
  }

  private static String dashboardUrl(Workspace workspace) {
    if (workspace.getType() == WorkspaceType.SQUAD) {
      return "/squad-dashboard?workspaceId=" + workspace.getId();
    }

    return "workspace-hub.html?workspaceId=" + workspace.getId();
  }

  private static String statusOf(WorkspaceStatus status) {
    return status == WorkspaceStatus.ARCHIVED ? "completed" : "progress";
  }

  private static String mentoringModeLabel(Workspace workspace) {
    if (workspace.getType() != WorkspaceType.MENTORING) {
      return null;
    }

    String text = (workspace.getName() + " " + (workspace.getDescription() == null ? "" : workspace.getDescription()));
    return text.contains("팀 프로젝트형") || text.contains("팀 프로젝트") ? "팀 프로젝트형" : "공통 과제형";
  }

  private static String mentoringModeIcon(String mentoringModeLabel) {
    if (mentoringModeLabel == null) {
      return null;
    }
    return "팀 프로젝트형".equals(mentoringModeLabel) ? "fas fa-puzzle-piece mr-1" : "fas fa-users mr-1";
  }

  private static int defaultProgress(WorkspaceType type) {
    if (type == WorkspaceType.SOLO) {
      return 10;
    }
    if (type == WorkspaceType.MENTORING) {
      return 20;
    }
    return 15;
  }

  private static String dateText(LocalDateTime createdAt) {
    return createdAt == null ? "방금" : createdAt.toLocalDate().toString();
  }

  private static List<String> memberSeeds(List<WorkspaceMember> members, Long currentUserId) {
    return members.stream()
        .sorted(
            (left, right) -> {
              boolean leftIsCurrent =
                  currentUserId != null && currentUserId.equals(left.getLearnerId());
              boolean rightIsCurrent =
                  currentUserId != null && currentUserId.equals(right.getLearnerId());

              if (leftIsCurrent == rightIsCurrent) {
                return 0;
              }

              return leftIsCurrent ? -1 : 1;
            })
        .limit(2)
        .map(member -> "workspace-member-" + member.getLearnerId())
        .toList();
  }

  private static Integer extraMemberCount(List<WorkspaceMember> members) {
    int extraCount = members.size() - 2;
    return extraCount > 0 ? extraCount : null;
  }
}

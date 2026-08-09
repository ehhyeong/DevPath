package com.devpath.api.workspace.service;

import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceType;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class WorkspaceHubRoleResolver {

  String resolve(
      Workspace workspace, List<WorkspaceMember> members, Long userId, List<WorkspaceTask> tasks) {
    String memberRoleLabel =
        members.stream()
            .filter(member -> userId != null && userId.equals(member.getLearnerId()))
            .map(WorkspaceMember::getPositionLabel)
            .filter(position -> position != null && !position.isBlank())
            .findFirst()
            .map(this::roleLabelFromPosition)
            .orElse(null);

    if (memberRoleLabel != null) {
      return memberRoleLabel;
    }

    String taskRoleLabel =
        tasks.stream()
            .map(this::inferRoleKey)
            .filter(Objects::nonNull)
            .collect(Collectors.groupingBy(role -> role, Collectors.counting()))
            .entrySet()
            .stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .map(this::roleLabel)
            .orElse(null);

    if (taskRoleLabel != null || workspace.getType() != WorkspaceType.MENTORING) {
      return taskRoleLabel;
    }

    String workspaceRoleKey =
        inferWorkspaceRoleKey(
            (workspace.getName() == null ? "" : workspace.getName())
                + " "
                + (workspace.getDescription() == null ? "" : workspace.getDescription()));
    return workspaceRoleKey == null ? null : roleLabel(workspaceRoleKey);
  }

  private String inferRoleKey(WorkspaceTask task) {
    String text =
        ((task.getTitle() == null ? "" : task.getTitle())
                + " "
                + (task.getDescription() == null ? "" : task.getDescription()))
            .toLowerCase();

    if (text.contains("[backend]")) {
      return "BACKEND";
    }
    if (text.contains("[frontend]")) {
      return "FRONTEND";
    }
    if (text.contains("[app]")) {
      return "APP";
    }
    if (text.matches(".*(\\[designer\\]|\\[design\\]).*")) {
      return "DESIGN";
    }
    if (text.contains("[pm]")) {
      return "PM";
    }
    if (text.matches(
        ".*(backend|back-end|server|spring|jpa|api|db|database|redis|백엔드|서버|데이터베이스).*")) {
      return "BACKEND";
    }
    if (text.matches(".*(frontend|front-end|react|next|vue|ui|ux|화면|프론트).*")) {
      return "FRONTEND";
    }
    if (text.matches(".*(app|mobile|react native|android|ios|앱|모바일).*")) {
      return "APP";
    }
    if (text.matches(".*(design|designer|figma|wireframe|디자인|디자이너).*")) {
      return "DESIGN";
    }
    if (text.matches(".*(planning|planner|기획|pm).*")) {
      return "PM";
    }
    if (text.matches(".*(fullstack|full-stack|풀스택).*")) {
      return "FULLSTACK";
    }
    return null;
  }

  private String inferWorkspaceRoleKey(String rawText) {
    String text = rawText == null ? "" : rawText.toLowerCase();

    if (containsAny(
        text, "backend", "back-end", "server", "spring", "jpa", "api", "db", "database", "redis")) {
      return "BACKEND";
    }
    if (containsAny(
        text, "frontend", "front-end", "react", "next", "vue", "ui", "ux", "tailwind")) {
      return "FRONTEND";
    }
    if (containsAny(text, "app", "mobile", "react native", "android", "ios")) {
      return "APP";
    }
    if (containsAny(text, "design", "designer", "figma", "wireframe")) {
      return "DESIGN";
    }
    if (containsAny(text, "planning", "planner", "pm")) {
      return "PM";
    }
    if (containsAny(text, "fullstack", "full-stack")) {
      return "FULLSTACK";
    }
    return null;
  }

  private boolean containsAny(String text, String... keywords) {
    for (String keyword : keywords) {
      if (text.contains(keyword)) {
        return true;
      }
    }
    return false;
  }

  private String roleLabelFromPosition(String positionLabel) {
    if (positionLabel == null || positionLabel.isBlank()) {
      return null;
    }

    String normalized = positionLabel.trim().toLowerCase(Locale.ROOT);
    if (normalized.contains("front")) {
      return "FE";
    }
    if (normalized.contains("back")) {
      return "BE";
    }
    if (normalized.contains("full")) {
      return "FS";
    }
    if (normalized.contains("design") || normalized.contains("?붿옄")) {
      return "DES";
    }
    if (normalized.contains("pm") || normalized.contains("湲고쉷")) {
      return "PM";
    }
    if (normalized.contains("devops")
        || normalized.contains("infra")
        || normalized.contains("?명봽")) {
      return "OPS";
    }
    return positionLabel.trim();
  }

  private String roleLabel(String roleKey) {
    return switch (roleKey) {
      case "BACKEND" -> "💻 Backend";
      case "FRONTEND" -> "🎨 Frontend";
      case "APP" -> "📱 App";
      case "DESIGN" -> "🎯 Design";
      case "PM" -> "📋 PM";
      case "FULLSTACK" -> "🧩 Fullstack";
      default -> roleKey;
    };
  }
}

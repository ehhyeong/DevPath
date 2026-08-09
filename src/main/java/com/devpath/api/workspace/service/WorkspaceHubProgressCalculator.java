package com.devpath.api.workspace.service;

import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringStatus;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceStatus;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
class WorkspaceHubProgressCalculator {

  int calculate(
      Workspace workspace,
      List<WorkspaceTask> tasks,
      List<Milestone> milestones,
      Mentoring mentoring) {
    if (workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
      return 100;
    }

    if (isTeamMentoringWorkspace(workspace, mentoring)) {
      return milestoneScheduleProgressPercent(milestones, tasks);
    }

    if (workspace.getType() == WorkspaceType.MENTORING) {
      return assignmentScheduleProgressPercent(tasks, mentoring);
    }

    return taskProgressPercent(tasks);
  }

  private int taskProgressPercent(List<WorkspaceTask> tasks) {
    if (tasks.isEmpty()) {
      return 0;
    }

    long doneCount =
        tasks.stream().filter(task -> task.getStatus() == WorkspaceTaskStatus.DONE).count();
    return clampPercent(Math.round(doneCount * 100.0 / tasks.size()));
  }

  private int milestoneScheduleProgressPercent(
      List<Milestone> milestones, List<WorkspaceTask> fallbackTasks) {
    if (milestones.isEmpty()) {
      return taskProgressPercent(fallbackTasks);
    }

    LocalDate today = LocalDate.now();
    long doneCount =
        milestones.stream()
            .filter(
                milestone ->
                    milestone.getStatus() == MilestoneStatus.DONE
                        || milestone.getStatus() == MilestoneStatus.CLOSED
                        || today.isAfter(milestone.getDueDate()))
            .count();
    return clampPercent(Math.round(doneCount * 100.0 / milestones.size()));
  }

  private int assignmentScheduleProgressPercent(List<WorkspaceTask> tasks, Mentoring mentoring) {
    if (tasks.isEmpty()) {
      return weeklyMentoringProgressPercent(mentoring);
    }

    List<WorkspaceTask> sortedTasks =
        tasks.stream()
            .sorted(
                Comparator.comparing(
                        WorkspaceTask::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(
                        WorkspaceTask::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(WorkspaceTask::getId))
            .toList();
    Map<Integer, List<WorkspaceTask>> tasksByWeek = new LinkedHashMap<>();

    for (int index = 0; index < sortedTasks.size(); index++) {
      WorkspaceTask task = sortedTasks.get(index);
      int week = inferAssignmentWeek(task, (index % 4) + 1);
      tasksByWeek.computeIfAbsent(week, ignored -> new ArrayList<>()).add(task);
    }

    if (tasksByWeek.isEmpty()) {
      return weeklyMentoringProgressPercent(mentoring);
    }

    LocalDate today = LocalDate.now();
    long completedCount =
        tasksByWeek.values().stream()
            .filter(weekTasks -> assignmentWeekCompleted(weekTasks, today))
            .count();
    return clampPercent(Math.round(completedCount * 100.0 / tasksByWeek.size()));
  }

  private boolean assignmentWeekCompleted(List<WorkspaceTask> weekTasks, LocalDate today) {
    if (weekTasks.isEmpty()) {
      return false;
    }

    boolean allDone =
        weekTasks.stream().allMatch(task -> task.getStatus() == WorkspaceTaskStatus.DONE);
    if (allDone) {
      return true;
    }

    LocalDate latestDueDate =
        weekTasks.stream()
            .map(WorkspaceTask::getDueDate)
            .filter(Objects::nonNull)
            .max(LocalDate::compareTo)
            .orElse(null);
    return latestDueDate != null && today.isAfter(latestDueDate);
  }

  private int inferAssignmentWeek(WorkspaceTask task, int fallbackWeek) {
    Integer titleWeek = parseWeekNumber(task.getTitle());
    if (titleWeek != null) {
      return titleWeek;
    }

    Integer descriptionWeek = parseWeekNumber(task.getDescription());
    return descriptionWeek == null ? fallbackWeek : descriptionWeek;
  }

  private Integer parseWeekNumber(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    String text = value.toLowerCase(Locale.ROOT);
    for (int week = 1; week <= 52; week++) {
      if (text.contains(week + "주차")
          || text.contains(week + " 주차")
          || text.contains("week " + week)
          || text.contains("week" + week)) {
        return week;
      }
    }
    return null;
  }

  private int weeklyMentoringProgressPercent(Mentoring mentoring) {
    if (mentoring == null) {
      return 0;
    }
    if (mentoring.getStatus() == MentoringStatus.COMPLETED) {
      return 100;
    }
    if (mentoring.getStatus() == MentoringStatus.CANCELLED) {
      return 0;
    }

    MentoringPost post = mentoring.getPost();
    int totalWeeks =
        post == null || post.getDurationWeeks() == null ? 4 : Math.max(1, post.getDurationWeeks());
    LocalDate startedOn =
        mentoring.getStartedAt() == null ? LocalDate.now() : mentoring.getStartedAt().toLocalDate();
    long elapsedWeeks = Math.max(0L, ChronoUnit.WEEKS.between(startedOn, LocalDate.now()));
    return clampPercent(Math.round(Math.min(totalWeeks, elapsedWeeks) * 100.0 / totalWeeks));
  }

  private boolean isTeamMentoringWorkspace(Workspace workspace, Mentoring mentoring) {
    if (workspace.getType() != WorkspaceType.MENTORING) {
      return false;
    }

    MentoringPost post = mentoring == null ? null : mentoring.getPost();
    String mentoringType = post == null ? null : post.getMentoringType();
    if (mentoringType != null) {
      String normalizedType = mentoringType.trim().toLowerCase(Locale.ROOT);
      if (normalizedType.contains("team") || normalizedType.contains("project")) {
        return true;
      }
    }

    String text =
        normalize(
            (workspace.getName() == null ? "" : workspace.getName())
                + " "
                + (workspace.getDescription() == null ? "" : workspace.getDescription()));
    return text.contains("teamproject")
        || text.contains("teamworkspace")
        || text.contains("팀프로젝트")
        || text.contains("팀워크스페이스");
  }

  private String normalize(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
  }

  private int clampPercent(long value) {
    return (int) Math.max(0, Math.min(100, value));
  }
}

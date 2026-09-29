package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.CalendarEventResponse;
import com.devpath.api.workspace.dto.MeetingNoteResponse;
import com.devpath.api.workspace.dto.MilestoneResponse;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.api.workspace.dto.WorkspaceDocResponse;
import com.devpath.api.workspace.dto.WorkspaceFileResponse;
import com.devpath.api.workspace.dto.WorkspaceMemberResponse;
import com.devpath.api.workspace.dto.WorkspaceTaskResponse;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * AI 비서 프롬프트에 넣을 워크스페이스 현황을 모은다. 기존 Service를 그대로 호출하므로 각 Service의 멤버 권한 검사가 그대로 적용된다. 조회만 하며 어떤 데이터도
 * 변경하지 않는다.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceAiContextCollector {

  private static final int MAX_TASKS = 60;
  private static final int MAX_MILESTONES = 30;
  private static final int MAX_FILES = 50;
  private static final int MAX_MEETING_NOTES = 20;
  private static final int MAX_DESCRIPTION_LENGTH = 200;
  private static final int MAX_DOC_LENGTH = 1500;
  private static final int MAX_ERD_LENGTH = 4000;
  private static final int EVENT_DAYS_BEFORE = 30;
  private static final int EVENT_DAYS_AFTER = 90;

  private static final DateTimeFormatter DATE_TIME =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private final WorkspaceService workspaceService;
  private final WorkspaceTaskService workspaceTaskService;
  private final CalendarEventService calendarEventService;
  private final MilestoneService milestoneService;
  private final WorkspaceFileService workspaceFileService;
  private final WorkspaceDocService workspaceDocService;
  private final WorkspaceErdDocumentService workspaceErdDocumentService;

  public String collect(Long workspaceId, Long userId, LocalDate today) {
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);

    StringBuilder context = new StringBuilder();
    appendWorkspace(context, dashboard);
    appendMembers(context, dashboard);
    appendTasks(context, workspaceId, userId, dashboard);
    appendEvents(context, workspaceId, userId, today);
    appendMilestones(context, workspaceId, userId);
    appendFiles(context, workspaceId, userId);
    appendErd(context, workspaceId, userId);
    appendDocs(context, workspaceId, userId);
    return context.toString();
  }

  private void appendWorkspace(StringBuilder context, WorkspaceDashboardResponse dashboard) {
    context.append("[워크스페이스]\n");
    context.append(String.format("이름: %s%n", dashboard.getName()));

    if (StringUtils.hasText(dashboard.getDescription())) {
      context.append(
          String.format("설명: %s%n", shorten(dashboard.getDescription(), MAX_DESCRIPTION_LENGTH)));
    }

    context.append(String.format("상태: %s%n", dashboard.getStatus()));
    context.append(String.format("오너: %s%n", nullToDash(dashboard.getOwnerName())));
    context.append(
        String.format(
            "미완료 작업 %d건, 진행 중 마일스톤 %d건%n%n",
            dashboard.getUnresolvedTaskCount(), dashboard.getActiveMilestoneCount()));
  }

  private void appendMembers(StringBuilder context, WorkspaceDashboardResponse dashboard) {
    context.append("[팀원]\n");
    List<WorkspaceMemberResponse> members = safeList(dashboard.getMembers());

    if (members.isEmpty()) {
      context.append("등록된 팀원이 없습니다.\n\n");
      return;
    }

    members.forEach(
        member ->
            context.append(
                String.format(
                    "- %s (%s, %s)%n",
                    nullToDash(member.getLearnerName()),
                    nullToDash(member.getPosition()),
                    nullToDash(member.getRoleLabel()))));
    context.append("\n");
  }

  private void appendTasks(
      StringBuilder context,
      Long workspaceId,
      Long userId,
      WorkspaceDashboardResponse dashboard) {
    context.append("[작업 현황판]\n");
    List<WorkspaceTaskResponse> tasks = workspaceTaskService.getTasks(workspaceId, userId);

    if (tasks.isEmpty()) {
      context.append("등록된 작업이 없습니다.\n\n");
      return;
    }

    Map<Long, String> memberNameById = new HashMap<>();
    safeList(dashboard.getMembers())
        .forEach(member -> memberNameById.put(member.getLearnerId(), member.getLearnerName()));

    tasks.stream()
        .limit(MAX_TASKS)
        .forEach(
            task -> {
              context.append(
                  String.format(
                      "- [%s] %s (담당 %s, 우선순위 %s, 마감 %s)",
                      task.getStatus(),
                      task.getTitle(),
                      task.getAssigneeId() == null
                          ? "미지정"
                          : memberNameById.getOrDefault(task.getAssigneeId(), "알 수 없음"),
                      task.getPriority() == null ? "-" : task.getPriority(),
                      task.getDueDate() == null ? "없음" : task.getDueDate()));

              if (StringUtils.hasText(task.getDescription())) {
                context.append(
                    String.format(" : %s", shorten(task.getDescription(), MAX_DESCRIPTION_LENGTH)));
              }

              context.append("\n");
            });

    appendOmitted(context, tasks.size(), MAX_TASKS);
    context.append("\n");
  }

  private void appendEvents(
      StringBuilder context, Long workspaceId, Long userId, LocalDate today) {
    context.append("[일정]\n");
    LocalDateTime from = today.minusDays(EVENT_DAYS_BEFORE).atStartOfDay();
    LocalDateTime to = today.plusDays(EVENT_DAYS_AFTER).atTime(23, 59, 59);

    List<CalendarEventResponse> events =
        calendarEventService.getEvents(workspaceId, userId, null, null).stream()
            .filter(event -> event.getStartAt() != null)
            .filter(event -> !event.getStartAt().isBefore(from) && !event.getStartAt().isAfter(to))
            .toList();

    if (events.isEmpty()) {
      context.append(
          String.format("최근 %d일 ~ 향후 %d일 사이에 등록된 일정이 없습니다.%n%n", EVENT_DAYS_BEFORE, EVENT_DAYS_AFTER));
      return;
    }

    events.forEach(
        event -> {
          context.append(
              String.format(
                  "- %s (%s ~ %s)",
                  event.getTitle(),
                  event.getStartAt().format(DATE_TIME),
                  event.getEndAt() == null ? "-" : event.getEndAt().format(DATE_TIME)));

          if (StringUtils.hasText(event.getDescription())) {
            context.append(
                String.format(" : %s", shorten(event.getDescription(), MAX_DESCRIPTION_LENGTH)));
          }

          context.append("\n");
        });
    context.append("\n");
  }

  private void appendMilestones(StringBuilder context, Long workspaceId, Long userId) {
    context.append("[마일스톤]\n");
    List<MilestoneResponse> milestones = milestoneService.getMilestones(workspaceId, userId);

    if (milestones.isEmpty()) {
      context.append("등록된 마일스톤이 없습니다.\n\n");
      return;
    }

    milestones.stream()
        .limit(MAX_MILESTONES)
        .forEach(
            milestone ->
                context.append(
                    String.format(
                        "- [%s] %s (%s ~ %s)%n",
                        milestone.getStatus(),
                        milestone.getTitle(),
                        milestone.getStartDate() == null ? "-" : milestone.getStartDate(),
                        milestone.getDueDate() == null ? "-" : milestone.getDueDate())));

    appendOmitted(context, milestones.size(), MAX_MILESTONES);
    context.append("\n");
  }

  private void appendFiles(StringBuilder context, Long workspaceId, Long userId) {
    context.append("[팀 자료실]\n");
    List<WorkspaceFileResponse> files = workspaceFileService.getFiles(workspaceId, userId);

    if (files.isEmpty()) {
      context.append("등록된 파일이 없습니다.\n\n");
      return;
    }

    files.stream()
        .limit(MAX_FILES)
        .forEach(
            file ->
                context.append(
                    String.format(
                        "- %s (%s, %s, 올린이 %s)%n",
                        nullToDash(file.getDisplayName()),
                        nullToDash(file.getItemType()),
                        file.getFileSize() > 0 ? formatSize(file.getFileSize()) : "-",
                        nullToDash(file.getUploadedByName()))));

    appendOmitted(context, files.size(), MAX_FILES);
    context.append("\n");
  }

  private void appendErd(StringBuilder context, Long workspaceId, Long userId) {
    context.append("[ERD]\n");
    String mermaidCode = workspaceErdDocumentService.findMermaidCodeForRead(workspaceId, userId);

    if (!StringUtils.hasText(mermaidCode) || "erDiagram".equals(mermaidCode.trim())) {
      context.append("작성된 ERD가 없습니다.\n\n");
      return;
    }

    // mermaid는 줄바꿈이 구문의 일부라 공백 정규화 없이 길이만 자른다.
    context.append(truncate(mermaidCode.trim(), MAX_ERD_LENGTH)).append("\n\n");
  }

  private void appendDocs(StringBuilder context, Long workspaceId, Long userId) {
    context.append("[팀 문서]\n");
    appendDoc(context, workspaceId, userId, WorkspaceDocType.API_SPEC, "API 명세");
    appendDoc(context, workspaceId, userId, WorkspaceDocType.ERD, "ERD 설명");
    appendDoc(context, workspaceId, userId, WorkspaceDocType.INFRA, "인프라 문서");

    List<MeetingNoteResponse> notes = workspaceDocService.getMeetingNotes(workspaceId, userId);

    if (notes.isEmpty()) {
      context.append("회의록: 없음\n");
      return;
    }

    context.append("회의록 목록(제목과 작성일만, 본문은 제공되지 않음):\n");
    notes.stream()
        .limit(MAX_MEETING_NOTES)
        .forEach(
            note ->
                context.append(
                    String.format(
                        "- %s (%s)%n",
                        note.getTitle(),
                        note.getCreatedAt() == null ? "-" : note.getCreatedAt().toLocalDate())));
    appendOmitted(context, notes.size(), MAX_MEETING_NOTES);
  }

  private void appendDoc(
      StringBuilder context, Long workspaceId, Long userId, WorkspaceDocType docType, String label) {
    WorkspaceDocResponse doc = workspaceDocService.getDoc(workspaceId, userId, docType);

    if (doc == null || !StringUtils.hasText(doc.getContent())) {
      context.append(String.format("%s: 작성되지 않음%n", label));
      return;
    }

    context.append(String.format("%s: %s%n", label, shorten(doc.getContent().trim(), MAX_DOC_LENGTH)));
  }

  private void appendOmitted(StringBuilder context, int total, int limit) {
    if (total > limit) {
      context.append(String.format("(외 %d건 생략)%n", total - limit));
    }
  }

  private <T> List<T> safeList(List<T> value) {
    return value == null ? List.of() : value;
  }

  private String nullToDash(String value) {
    return StringUtils.hasText(value) ? value : "-";
  }

  private String formatSize(long bytes) {
    if (bytes < 1024) {
      return bytes + "B";
    }

    if (bytes < 1024 * 1024) {
      return (bytes / 1024) + "KB";
    }

    return (bytes / (1024 * 1024)) + "MB";
  }

  private String shorten(String value, int maxLength) {
    return truncate(value.replaceAll("\\s+", " ").trim(), maxLength);
  }

  private String truncate(String value, int maxLength) {
    return value.length() <= maxLength ? value : value.substring(0, maxLength) + "...";
  }
}
package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.CalendarEventResponse;
import com.devpath.api.workspace.dto.MeetingNoteResponse;
import com.devpath.api.workspace.dto.MilestoneResponse;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.api.workspace.dto.WorkspaceDocResponse;
import com.devpath.api.workspace.dto.WorkspaceFileResponse;
import com.devpath.api.workspace.dto.WorkspaceMemberResponse;
import com.devpath.api.workspace.dto.WorkspaceTaskResponse;
import com.devpath.api.workspace.preview.WorkspaceDocumentPreviewer;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * AI 비서 프롬프트에 넣을 워크스페이스 현황을 모은다. 기존 Service를 그대로 호출하므로 각 Service의 멤버 권한 검사가 그대로 적용된다. 조회만 하며 어떤 데이터도
 * 변경하지 않는다. 변경 제안이 대상을 가리킬 수 있도록 항목마다 id를 함께 싣는다.
 */
// 트랜잭션을 열지 않는다. 각 Service가 자체 트랜잭션을 갖고 있고, 파일 추출 실패처럼 잡아서 넘기는
// 예외가 공유 트랜잭션을 rollback-only로 만들어 커밋 시점에 터지는 것을 피하기 위해서다.
@Component
@RequiredArgsConstructor
public class WorkspaceAiContextCollector {

  private static final int MAX_TASKS = 60;
  private static final int MAX_MILESTONES = 30;
  private static final int MAX_FILES = 50;
  private static final int MAX_MEETING_NOTES = 20;
  private static final int MAX_DESCRIPTION_LENGTH = 200;
  // 아래 상한은 WorkspaceAiActionService가 '전체를 본 문서만 교체 가능' 판정에 함께 쓴다.
  static final int MAX_DOC_LENGTH = 1500;
  static final int MAX_ERD_LENGTH = 4000;
  static final int MAX_API_SPEC_LENGTH = 4000;
  static final int MAX_MEETING_NOTE_BODIES = 5;
  private static final int EVENT_DAYS_BEFORE = 30;
  private static final int EVENT_DAYS_AFTER = 90;
  // 파일 본문 주입 상한. 프롬프트 비대화와 대용량 파일 반복 파싱을 함께 막는다.
  private static final int MAX_FILE_CONTENT_CHARS = 8000;
  private static final int MAX_TOTAL_CONTENT_CHARS = 40000;
  private static final int MAX_EXTRACT_FILES = 10;
  private static final long MAX_EXTRACT_FILE_BYTES = 2L * 1024 * 1024;
  private static final long MAX_TOTAL_EXTRACT_BYTES = 8L * 1024 * 1024;

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
                    "- id=%d %s (%s, %s)%n",
                    member.getLearnerId(),
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
                      "- id=%d [%s] %s (담당 %s, 우선순위 %s, 마감 %s)",
                      task.getTaskId(),
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
                  "- id=%d %s (%s ~ %s)",
                  event.getEventId(),
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
                        "- id=%d [%s] %s (%s ~ %s)%n",
                        milestone.getMilestoneId(),
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
    appendFileContents(context, files, userId);
  }

  /**
   * 읽을 수 있는 파일의 본문을 상한 안에서 덧붙인다. 개별 파일 추출 실패가 전체 답변을 막지 않도록 파일 단위로 예외를 삼키고 이유만 남긴다.
   */
  private void appendFileContents(
      StringBuilder context, List<WorkspaceFileResponse> files, Long userId) {
    StringBuilder contents = new StringBuilder();
    List<String> skipped = new ArrayList<>();
    int usedChars = 0;
    long usedBytes = 0;
    int extractedCount = 0;

    for (WorkspaceFileResponse file : files) {
      String name = nullToDash(file.getDisplayName());

      if (!"FILE".equalsIgnoreCase(file.getItemType())) {
        continue;
      }

      if (!WorkspaceDocumentPreviewer.isTextExtractable(file.getOriginalFileName())) {
        skipped.add(String.format("%s(내용을 읽을 수 없는 형식)", name));
        continue;
      }

      if (file.getFileSize() > MAX_EXTRACT_FILE_BYTES) {
        skipped.add(String.format("%s(용량 초과)", name));
        continue;
      }

      if (extractedCount >= MAX_EXTRACT_FILES
          || usedChars >= MAX_TOTAL_CONTENT_CHARS
          || usedBytes >= MAX_TOTAL_EXTRACT_BYTES) {
        skipped.add(String.format("%s(분량 한도 초과)", name));
        continue;
      }

      String text;

      try {
        text = workspaceFileService.getDocumentPreview(file.getFileId(), userId).getText();
      } catch (Exception e) {
        skipped.add(String.format("%s(본문 추출 실패)", name));
        continue;
      }

      if (!StringUtils.hasText(text)) {
        skipped.add(String.format("%s(본문 텍스트 없음)", name));
        continue;
      }

      int budget = Math.min(MAX_FILE_CONTENT_CHARS, MAX_TOTAL_CONTENT_CHARS - usedChars);
      String body = truncate(text.trim(), budget);
      contents.append(String.format("--- %s ---%n%s%n%n", name, body));
      usedChars += body.length();
      usedBytes += file.getFileSize();
      extractedCount++;
    }

    if (contents.length() == 0 && skipped.isEmpty()) {
      return;
    }

    context.append("[파일 본문]\n");

    if (contents.length() > 0) {
      context.append(contents);
    }

    if (!skipped.isEmpty()) {
      context.append(String.format("(본문을 싣지 못한 파일: %s)%n", String.join(", ", skipped)));
    }

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
    context.append(truncate(mermaidCode.trim(), MAX_ERD_LENGTH)).append("\n");
    appendTruncatedNotice(context, mermaidCode.trim(), MAX_ERD_LENGTH, "ERD");
    context.append("\n");
  }

  private void appendDocs(StringBuilder context, Long workspaceId, Long userId) {
    context.append("[팀 문서]\n");
    appendApiSpec(context, workspaceId, userId);
    appendDoc(context, workspaceId, userId, WorkspaceDocType.ERD, "ERD 설명");
    appendDoc(context, workspaceId, userId, WorkspaceDocType.INFRA, "인프라 문서");

    List<MeetingNoteResponse> notes = workspaceDocService.getMeetingNotes(workspaceId, userId);

    if (notes.isEmpty()) {
      context.append("회의록: 없음\n");
      return;
    }

    context.append(
        String.format("회의록 목록(최신순, 본문은 최근 %d건만 아래에 제공):%n", MAX_MEETING_NOTE_BODIES));
    notes.stream()
        .limit(MAX_MEETING_NOTES)
        .forEach(
            note ->
                context.append(
                    String.format(
                        "- id=%d %s (%s)%n",
                        note.getNoteId(),
                        note.getTitle(),
                        note.getCreatedAt() == null ? "-" : note.getCreatedAt().toLocalDate())));
    appendOmitted(context, notes.size(), MAX_MEETING_NOTES);

    context.append("\n[회의록 본문]\n");
    notes.stream()
        .limit(MAX_MEETING_NOTE_BODIES)
        .forEach(
            note -> {
              String content = note.getContent() == null ? "" : note.getContent().trim();
              context.append(String.format("--- id=%d %s ---%n", note.getNoteId(), note.getTitle()));
              context.append(content.isEmpty() ? "(본문 없음)" : truncate(content, MAX_DOC_LENGTH));
              context.append("\n");
              appendTruncatedNotice(context, content, MAX_DOC_LENGTH, "이 회의록");
            });
  }

  // API 명세는 한 줄이 엔드포인트 하나라 줄바꿈을 살려 싣는다.
  private void appendApiSpec(StringBuilder context, Long workspaceId, Long userId) {
    WorkspaceDocResponse doc =
        workspaceDocService.getDoc(workspaceId, userId, WorkspaceDocType.API_SPEC);

    if (doc == null || !StringUtils.hasText(doc.getContent())) {
      context.append("API 명세: 작성되지 않음\n");
      return;
    }

    String content = doc.getContent().trim();
    context.append("API 명세:\n").append(truncate(content, MAX_API_SPEC_LENGTH)).append("\n");
    appendTruncatedNotice(context, content, MAX_API_SPEC_LENGTH, "API 명세");
  }

  // 일부만 실린 문서를 AI가 통째로 교체하면 안 본 부분이 사라지므로 수정 불가를 명시한다.
  private void appendTruncatedNotice(
      StringBuilder context, String content, int maxLength, String label) {
    if (content.length() > maxLength) {
      context.append(String.format("(%s는 길어서 일부만 실었다. 수정 제안 불가)%n", label));
    }
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
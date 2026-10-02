package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.CalendarEventResponse;
import com.devpath.api.workspace.dto.CreateCalendarEventRequest;
import com.devpath.api.workspace.dto.CreateMeetingNoteRequest;
import com.devpath.api.workspace.dto.CreateMilestoneRequest;
import com.devpath.api.workspace.dto.CreateTaskRequest;
import com.devpath.api.workspace.dto.MeetingNoteResponse;
import com.devpath.api.workspace.dto.MilestoneResponse;
import com.devpath.api.workspace.dto.UpdateCalendarEventRequest;
import com.devpath.api.workspace.dto.UpdateMilestoneRequest;
import com.devpath.api.workspace.dto.UpdateTaskAssigneeRequest;
import com.devpath.api.workspace.dto.UpdateTaskRequest;
import com.devpath.api.workspace.dto.UpdateTaskStatusRequest;
import com.devpath.api.workspace.dto.UpdateWorkspaceDocRequest;
import com.devpath.api.workspace.dto.WorkspaceAiAction;
import com.devpath.api.workspace.dto.WorkspaceAiActionExecuteResponse;
import com.devpath.api.workspace.dto.WorkspaceAiActionType;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.api.workspace.dto.WorkspaceDocResponse;
import com.devpath.api.workspace.dto.WorkspaceErdRequest;
import com.devpath.api.workspace.dto.WorkspaceTaskResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * AI 비서의 변경 제안을 검증하고, 팀원이 확인하면 실행한다. 실행은 기존 Service를 그대로 호출하므로 각 Service의 멤버 권한 검사가 그대로 적용된다. 제안
 * 시점과 실행 시점에 같은 검증을 두 번 거친다(그사이 데이터가 바뀌었거나 클라이언트가 값을 바꿨을 수 있다).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceAiActionService {

  static final int MAX_ACTIONS = 10;
  private static final int MAX_CHANGE_SUMMARY_LENGTH = 500;
  private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("M/d");
  private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("M/d HH:mm");
  private static final Map<WorkspaceTaskStatus, String> TASK_STATUS_LABELS =
      Map.of(
          WorkspaceTaskStatus.TODO, "할 일",
          WorkspaceTaskStatus.IN_PROGRESS, "진행 중",
          WorkspaceTaskStatus.IN_REVIEW, "리뷰 중",
          WorkspaceTaskStatus.DONE, "완료");
  private static final Map<MilestoneStatus, String> MILESTONE_STATUS_LABELS =
      Map.of(
          MilestoneStatus.OPEN, "시작 전",
          MilestoneStatus.IN_PROGRESS, "진행 중",
          MilestoneStatus.DONE, "완료",
          MilestoneStatus.CLOSED, "종료");
  private static final Map<WorkspaceTaskPriority, String> PRIORITY_LABELS =
      Map.of(
          WorkspaceTaskPriority.LOW, "낮음",
          WorkspaceTaskPriority.MEDIUM, "보통",
          WorkspaceTaskPriority.HIGH, "높음");

  private final WorkspaceService workspaceService;
  private final WorkspaceTaskService workspaceTaskService;
  private final CalendarEventService calendarEventService;
  private final MilestoneService milestoneService;
  private final WorkspaceDocService workspaceDocService;
  private final WorkspaceErdDocumentService workspaceErdDocumentService;
  private final ObjectMapper objectMapper;
  private final Validator validator;

  /** AI가 낸 변경 제안을 검증해 미리보기와 함께 돌려준다. 잘못된 제안은 버린다. 아무것도 변경하지 않는다. */
  public List<WorkspaceAiAction> propose(Long workspaceId, Long userId, JsonNode actionsNode) {
    if (actionsNode == null || !actionsNode.isArray() || actionsNode.isEmpty()) {
      return List.of();
    }

    Snapshot snapshot = loadSnapshot(workspaceId, userId);
    List<WorkspaceAiAction> proposals = new ArrayList<>();
    Set<String> targets = new HashSet<>();

    for (JsonNode actionNode : actionsNode) {
      if (proposals.size() >= MAX_ACTIONS) {
        break;
      }

      WorkspaceAiAction raw = parse(actionNode);

      if (raw == null) {
        continue;
      }

      try {
        WorkspaceAiAction resolved = resolve(raw, snapshot);
        String targetKey = targetKey(resolved);

        if (targetKey == null || targets.add(targetKey)) {
          proposals.add(resolved);
        }
      } catch (InvalidActionException e) {
        log.info("[WorkspaceAiActionService] 제안 제외 type={} reason={}", raw.getType(), e.getMessage());
      }
    }

    return proposals;
  }

  /** 팀원이 확인한 변경 제안을 다시 검증한 뒤 한 트랜잭션으로 실행한다. 하나라도 실패하면 전부 되돌린다. */
  @Transactional
  public WorkspaceAiActionExecuteResponse execute(
      Long workspaceId, Long userId, List<WorkspaceAiAction> actions) {
    Snapshot snapshot = loadSnapshot(workspaceId, userId);
    List<WorkspaceAiAction> resolvedActions = new ArrayList<>();
    Set<String> targets = new HashSet<>();

    for (WorkspaceAiAction action : actions) {
      WorkspaceAiAction resolved;

      try {
        resolved = resolve(action, snapshot);
      } catch (InvalidActionException e) {
        throw new CustomException(ErrorCode.WORKSPACE_AI_ACTION_INVALID, e.getMessage());
      }

      String targetKey = targetKey(resolved);

      if (targetKey != null && !targets.add(targetKey)) {
        throw new CustomException(
            ErrorCode.WORKSPACE_AI_ACTION_INVALID, "같은 대상을 한 번에 두 번 변경할 수 없습니다.");
      }

      resolvedActions.add(resolved);
    }

    resolvedActions.forEach(action -> apply(workspaceId, userId, action, snapshot));
    return WorkspaceAiActionExecuteResponse.of(
        resolvedActions.stream().map(WorkspaceAiAction::getSummary).toList());
  }

  // ── 검증·정규화 ──

  /** 제안을 현재 데이터 기준으로 검증하고, 수정 제안의 빈 필드는 현재 값으로 채운 뒤 미리보기 문구를 붙인다. */
  private WorkspaceAiAction resolve(WorkspaceAiAction action, Snapshot snapshot) {
    if (action.getType() == null) {
      throw new InvalidActionException("변경 종류가 없습니다.");
    }

    return switch (action.getType()) {
      case TASK_CREATE -> resolveTaskCreate(action, snapshot);
      case TASK_UPDATE -> resolveTaskUpdate(action, snapshot);
      case TASK_DELETE -> {
        WorkspaceTaskResponse task = require(snapshot.tasks(), action.getTargetId(), "작업");
        yield onlyTarget(action, "작업 삭제: " + task.getTitle());
      }
      case EVENT_CREATE -> resolveEventCreate(action);
      case EVENT_UPDATE -> resolveEventUpdate(action, snapshot);
      case EVENT_DELETE -> {
        CalendarEventResponse event = require(snapshot.events(), action.getTargetId(), "일정");
        yield onlyTarget(action, "일정 삭제: " + event.getTitle());
      }
      case MILESTONE_CREATE -> resolveMilestoneCreate(action);
      case MILESTONE_UPDATE -> resolveMilestoneUpdate(action, snapshot);
      case MILESTONE_DELETE -> {
        MilestoneResponse milestone =
            require(snapshot.milestones(), action.getTargetId(), "마일스톤");
        yield onlyTarget(action, "마일스톤 삭제: " + milestone.getTitle());
      }
      case MEETING_NOTE_CREATE -> resolveMeetingNoteCreate(action);
      case MEETING_NOTE_UPDATE -> resolveMeetingNoteUpdate(action, snapshot);
      case MEETING_NOTE_DELETE -> {
        MeetingNoteResponse note = require(snapshot.notes(), action.getTargetId(), "회의록");
        yield onlyTarget(action, "회의록 삭제: " + note.getTitle());
      }
      case ERD_UPDATE -> resolveErdUpdate(action, snapshot);
      case API_SPEC_UPDATE -> resolveApiSpecUpdate(action, snapshot);
    };
  }

  private WorkspaceAiAction resolveTaskCreate(WorkspaceAiAction action, Snapshot snapshot) {
    WorkspaceTaskPriority priority = parseEnum(WorkspaceTaskPriority.class, action.getPriority());
    Long assigneeId = requireMemberOrNull(snapshot, action.getAssigneeId());
    validate(
        CreateTaskRequest.class,
        fields(
            "title", action.getTitle(),
            "description", action.getDescription(),
            "priority", priority,
            "assigneeId", assigneeId,
            "dueDate", action.getDueDate()));

    List<String> details = new ArrayList<>();
    details.add("담당 " + (assigneeId == null ? "미지정" : snapshot.memberNames().get(assigneeId)));

    if (priority != null) {
      details.add("우선순위 " + PRIORITY_LABELS.get(priority));
    }

    if (action.getDueDate() != null) {
      details.add("마감 " + action.getDueDate().format(DATE));
    }

    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.TASK_CREATE)
        .title(action.getTitle().trim())
        .description(action.getDescription())
        .priority(priority == null ? null : priority.name())
        .assigneeId(assigneeId)
        .dueDate(action.getDueDate())
        .summary("작업 추가: " + action.getTitle().trim() + " · " + String.join(" · ", details))
        .build();
  }

  private WorkspaceAiAction resolveTaskUpdate(WorkspaceAiAction action, Snapshot snapshot) {
    WorkspaceTaskResponse current = require(snapshot.tasks(), action.getTargetId(), "작업");
    String title = firstText(action.getTitle(), current.getTitle());
    String description = firstText(action.getDescription(), current.getDescription());
    WorkspaceTaskPriority priority =
        firstNonNull(
            parseEnum(WorkspaceTaskPriority.class, action.getPriority()), current.getPriority());
    LocalDate dueDate = firstNonNull(action.getDueDate(), current.getDueDate());
    WorkspaceTaskStatus status =
        firstNonNull(
            parseEnum(WorkspaceTaskStatus.class, action.getStatus()), current.getStatus());
    Long assigneeId =
        action.getAssigneeId() == null
            ? current.getAssigneeId()
            : requireMemberOrNull(snapshot, action.getAssigneeId());
    validate(
        UpdateTaskRequest.class,
        fields(
            "title", title,
            "description", description,
            "priority", priority,
            "dueDate", dueDate));

    List<String> changes = new ArrayList<>();
    addChange(changes, "제목", current.getTitle(), title, Function.identity());
    addChange(changes, "상태", current.getStatus(), status, TASK_STATUS_LABELS::get);
    addChange(
        changes,
        "담당",
        current.getAssigneeId(),
        assigneeId,
        id -> snapshot.memberNames().getOrDefault(id, "알 수 없음"));
    addChange(changes, "우선순위", current.getPriority(), priority, PRIORITY_LABELS::get);
    addChange(changes, "마감", current.getDueDate(), dueDate, date -> date.format(DATE));

    if (!Objects.equals(current.getDescription(), description)) {
      changes.add("설명 변경");
    }

    requireChanges(changes);
    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.TASK_UPDATE)
        .targetId(current.getTaskId())
        .title(title)
        .description(description)
        .priority(priority == null ? null : priority.name())
        .status(status == null ? null : status.name())
        .assigneeId(assigneeId)
        .dueDate(dueDate)
        .summary("작업 수정: " + current.getTitle() + " · " + String.join(" · ", changes))
        .build();
  }

  private WorkspaceAiAction resolveEventCreate(WorkspaceAiAction action) {
    // 종료 시각이 없으면 1시간짜리 일정으로 본다.
    LocalDateTime endAt =
        action.getEndAt() == null && action.getStartAt() != null
            ? action.getStartAt().plusHours(1)
            : action.getEndAt();
    validate(
        CreateCalendarEventRequest.class,
        fields(
            "title", action.getTitle(),
            "description", action.getDescription(),
            "startAt", action.getStartAt(),
            "endAt", endAt));
    requireOrder(action.getStartAt(), endAt, "일정 종료 시각이 시작 시각보다 빠릅니다.");

    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.EVENT_CREATE)
        .title(action.getTitle().trim())
        .description(action.getDescription())
        .startAt(action.getStartAt())
        .endAt(endAt)
        .summary(
            "일정 추가: "
                + action.getTitle().trim()
                + " · "
                + formatRange(action.getStartAt(), endAt))
        .build();
  }

  private WorkspaceAiAction resolveEventUpdate(WorkspaceAiAction action, Snapshot snapshot) {
    CalendarEventResponse current = require(snapshot.events(), action.getTargetId(), "일정");
    String title = firstText(action.getTitle(), current.getTitle());
    String description = firstText(action.getDescription(), current.getDescription());
    LocalDateTime startAt = firstNonNull(action.getStartAt(), current.getStartAt());
    LocalDateTime endAt = firstNonNull(action.getEndAt(), current.getEndAt());
    validate(
        UpdateCalendarEventRequest.class,
        fields("title", title, "description", description, "startAt", startAt, "endAt", endAt));
    requireOrder(startAt, endAt, "일정 종료 시각이 시작 시각보다 빠릅니다.");

    List<String> changes = new ArrayList<>();
    addChange(changes, "제목", current.getTitle(), title, Function.identity());

    if (!Objects.equals(current.getStartAt(), startAt)
        || !Objects.equals(current.getEndAt(), endAt)) {
      changes.add("시간 " + formatRange(startAt, endAt));
    }

    if (!Objects.equals(current.getDescription(), description)) {
      changes.add("설명 변경");
    }

    requireChanges(changes);
    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.EVENT_UPDATE)
        .targetId(current.getEventId())
        .title(title)
        .description(description)
        .startAt(startAt)
        .endAt(endAt)
        .summary("일정 수정: " + current.getTitle() + " · " + String.join(" · ", changes))
        .build();
  }

  private WorkspaceAiAction resolveMilestoneCreate(WorkspaceAiAction action) {
    validate(
        CreateMilestoneRequest.class,
        fields(
            "title", action.getTitle(),
            "description", action.getDescription(),
            "startDate", action.getStartDate(),
            "dueDate", action.getDueDate()));
    requireOrder(action.getStartDate(), action.getDueDate(), "마일스톤 마감일이 시작일보다 빠릅니다.");

    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.MILESTONE_CREATE)
        .title(action.getTitle().trim())
        .description(action.getDescription())
        .startDate(action.getStartDate())
        .dueDate(action.getDueDate())
        .summary(
            "마일스톤 추가: "
                + action.getTitle().trim()
                + " · "
                + formatDateRange(action.getStartDate(), action.getDueDate()))
        .build();
  }

  private WorkspaceAiAction resolveMilestoneUpdate(WorkspaceAiAction action, Snapshot snapshot) {
    MilestoneResponse current = require(snapshot.milestones(), action.getTargetId(), "마일스톤");
    String title = firstText(action.getTitle(), current.getTitle());
    String description = firstText(action.getDescription(), current.getDescription());
    LocalDate startDate = firstNonNull(action.getStartDate(), current.getStartDate());
    LocalDate dueDate = firstNonNull(action.getDueDate(), current.getDueDate());
    MilestoneStatus status =
        firstNonNull(
            parseEnum(MilestoneStatus.class, action.getStatus()), current.getStatus());
    validate(
        UpdateMilestoneRequest.class,
        fields(
            "title", title,
            "description", description,
            "startDate", startDate,
            "dueDate", dueDate,
            "status", status));
    requireOrder(startDate, dueDate, "마일스톤 마감일이 시작일보다 빠릅니다.");

    List<String> changes = new ArrayList<>();
    addChange(changes, "제목", current.getTitle(), title, Function.identity());
    addChange(changes, "상태", current.getStatus(), status, MILESTONE_STATUS_LABELS::get);

    if (!Objects.equals(current.getStartDate(), startDate)
        || !Objects.equals(current.getDueDate(), dueDate)) {
      changes.add("기간 " + formatDateRange(startDate, dueDate));
    }

    if (!Objects.equals(current.getDescription(), description)) {
      changes.add("설명 변경");
    }

    requireChanges(changes);
    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.MILESTONE_UPDATE)
        .targetId(current.getMilestoneId())
        .title(title)
        .description(description)
        .startDate(startDate)
        .dueDate(dueDate)
        .status(status == null ? null : status.name())
        .summary("마일스톤 수정: " + current.getTitle() + " · " + String.join(" · ", changes))
        .build();
  }

  private WorkspaceAiAction resolveMeetingNoteCreate(WorkspaceAiAction action) {
    validate(
        CreateMeetingNoteRequest.class,
        fields("title", action.getTitle(), "content", action.getContent()));

    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.MEETING_NOTE_CREATE)
        .title(action.getTitle().trim())
        .content(action.getContent())
        .summary("회의록 작성: " + action.getTitle().trim())
        .build();
  }

  private WorkspaceAiAction resolveMeetingNoteUpdate(WorkspaceAiAction action, Snapshot snapshot) {
    MeetingNoteResponse current = require(snapshot.notes(), action.getTargetId(), "회의록");

    if (!snapshot.editableNoteIds().contains(current.getNoteId())) {
      throw new InvalidActionException("본문 전체를 확인하지 못한 회의록이라 수정할 수 없습니다.");
    }

    String title = firstText(action.getTitle(), current.getTitle());
    String content = firstText(action.getContent(), current.getContent());
    validate(CreateMeetingNoteRequest.class, fields("title", title, "content", content));

    List<String> changes = new ArrayList<>();
    addChange(changes, "제목", current.getTitle(), title, Function.identity());

    if (!Objects.equals(current.getContent(), content)) {
      changes.add("본문 변경");
    }

    requireChanges(changes);
    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.MEETING_NOTE_UPDATE)
        .targetId(current.getNoteId())
        .title(title)
        .content(content)
        .summary("회의록 수정: " + current.getTitle() + " · " + String.join(" · ", changes))
        .build();
  }

  private WorkspaceAiAction resolveErdUpdate(WorkspaceAiAction action, Snapshot snapshot) {
    if (!StringUtils.hasText(action.getContent())
        || !action.getContent().trim().startsWith("erDiagram")) {
      throw new InvalidActionException("ERD는 erDiagram으로 시작하는 mermaid 원문이어야 합니다.");
    }

    requireFullyVisible(snapshot.erdCode(), WorkspaceAiContextCollector.MAX_ERD_LENGTH, "ERD");
    String content = action.getContent().trim();

    if (content.equals(snapshot.erdCode())) {
      throw new InvalidActionException("변경 사항이 없습니다.");
    }

    String changeSummary =
        StringUtils.hasText(action.getDescription())
            ? truncate(action.getDescription().trim(), MAX_CHANGE_SUMMARY_LENGTH)
            : "AI 비서 제안으로 수정";
    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.ERD_UPDATE)
        .content(content)
        .description(changeSummary)
        .schemaJson(action.getSchemaJson())
        .summary("ERD 수정: " + changeSummary)
        .build();
  }

  private WorkspaceAiAction resolveApiSpecUpdate(WorkspaceAiAction action, Snapshot snapshot) {
    if (!StringUtils.hasText(action.getContent())) {
      throw new InvalidActionException("API 명세 본문이 비어 있습니다.");
    }

    requireFullyVisible(
        snapshot.apiSpec(), WorkspaceAiContextCollector.MAX_API_SPEC_LENGTH, "API 명세");
    String content = action.getContent().trim();

    if (content.equals(snapshot.apiSpec())) {
      throw new InvalidActionException("변경 사항이 없습니다.");
    }

    return WorkspaceAiAction.builder()
        .type(WorkspaceAiActionType.API_SPEC_UPDATE)
        .content(content)
        .description(action.getDescription())
        .summary(
            "API 명세 수정: "
                + (StringUtils.hasText(action.getDescription())
                    ? truncate(action.getDescription().trim(), MAX_CHANGE_SUMMARY_LENGTH)
                    : "본문 교체"))
        .build();
  }

  // ── 실행 ──

  private void apply(Long workspaceId, Long userId, WorkspaceAiAction action, Snapshot snapshot) {
    switch (action.getType()) {
      case TASK_CREATE ->
          workspaceTaskService.createTask(
              workspaceId,
              userId,
              convert(
                  CreateTaskRequest.class,
                  fields(
                      "title", action.getTitle(),
                      "description", action.getDescription(),
                      "priority", action.getPriority(),
                      "assigneeId", action.getAssigneeId(),
                      "dueDate", action.getDueDate())));
      case TASK_UPDATE -> applyTaskUpdate(workspaceId, userId, action, snapshot);
      case TASK_DELETE -> workspaceTaskService.deleteTask(workspaceId, action.getTargetId(), userId);
      case EVENT_CREATE ->
          calendarEventService.createEvent(
              workspaceId,
              userId,
              convert(
                  CreateCalendarEventRequest.class,
                  fields(
                      "title", action.getTitle(),
                      "description", action.getDescription(),
                      "startAt", action.getStartAt(),
                      "endAt", action.getEndAt())));
      case EVENT_UPDATE ->
          calendarEventService.updateEvent(
              action.getTargetId(),
              userId,
              convert(
                  UpdateCalendarEventRequest.class,
                  fields(
                      "title", action.getTitle(),
                      "description", action.getDescription(),
                      "startAt", action.getStartAt(),
                      "endAt", action.getEndAt())));
      case EVENT_DELETE -> calendarEventService.deleteEvent(action.getTargetId(), userId);
      case MILESTONE_CREATE ->
          milestoneService.createMilestone(
              workspaceId,
              userId,
              convert(
                  CreateMilestoneRequest.class,
                  fields(
                      "title", action.getTitle(),
                      "description", action.getDescription(),
                      "startDate", action.getStartDate(),
                      "dueDate", action.getDueDate())));
      case MILESTONE_UPDATE ->
          milestoneService.updateMilestone(
              action.getTargetId(),
              userId,
              convert(
                  UpdateMilestoneRequest.class,
                  fields(
                      "title", action.getTitle(),
                      "description", action.getDescription(),
                      "startDate", action.getStartDate(),
                      "dueDate", action.getDueDate(),
                      "status", action.getStatus())));
      case MILESTONE_DELETE -> milestoneService.deleteMilestone(action.getTargetId(), userId);
      case MEETING_NOTE_CREATE ->
          workspaceDocService.createMeetingNote(
              workspaceId,
              userId,
              convert(
                  CreateMeetingNoteRequest.class,
                  fields("title", action.getTitle(), "content", action.getContent())));
      case MEETING_NOTE_UPDATE ->
          workspaceDocService.updateMeetingNote(
              action.getTargetId(),
              userId,
              convert(
                  CreateMeetingNoteRequest.class,
                  fields("title", action.getTitle(), "content", action.getContent())));
      case MEETING_NOTE_DELETE -> workspaceDocService.deleteMeetingNote(action.getTargetId(), userId);
      case ERD_UPDATE ->
          workspaceErdDocumentService.saveDocument(
              workspaceId,
              userId,
              new WorkspaceErdRequest.Save(
                  action.getContent(), action.getSchemaJson(), action.getDescription()));
      case API_SPEC_UPDATE ->
          workspaceDocService.upsertDoc(
              workspaceId,
              userId,
              WorkspaceDocType.API_SPEC,
              convert(UpdateWorkspaceDocRequest.class, fields("content", action.getContent())));
    }
  }

  // 상태·담당자 변경은 전용 API를 따로 거친다(담당자 배정 알림 등 기존 부수 효과 유지). 바뀐 항목만 호출한다.
  private void applyTaskUpdate(
      Long workspaceId, Long userId, WorkspaceAiAction action, Snapshot snapshot) {
    WorkspaceTaskResponse current = snapshot.tasks().get(action.getTargetId());
    Long taskId = action.getTargetId();
    WorkspaceTaskPriority priority = parseEnum(WorkspaceTaskPriority.class, action.getPriority());
    WorkspaceTaskStatus status = parseEnum(WorkspaceTaskStatus.class, action.getStatus());

    if (!Objects.equals(current.getTitle(), action.getTitle())
        || !Objects.equals(current.getDescription(), action.getDescription())
        || !Objects.equals(current.getPriority(), priority)
        || !Objects.equals(current.getDueDate(), action.getDueDate())) {
      workspaceTaskService.updateTask(
          workspaceId,
          taskId,
          userId,
          convert(
              UpdateTaskRequest.class,
              fields(
                  "title", action.getTitle(),
                  "description", action.getDescription(),
                  "priority", priority,
                  "dueDate", action.getDueDate())));
    }

    if (!Objects.equals(current.getStatus(), status)) {
      workspaceTaskService.updateTaskStatus(
          workspaceId,
          taskId,
          userId,
          convert(UpdateTaskStatusRequest.class, fields("status", status)));
    }

    if (!Objects.equals(current.getAssigneeId(), action.getAssigneeId())) {
      workspaceTaskService.updateTaskAssignee(
          workspaceId,
          taskId,
          userId,
          convert(UpdateTaskAssigneeRequest.class, fields("assigneeId", action.getAssigneeId())));
    }
  }

  // ── 데이터 스냅샷 ──

  private Snapshot loadSnapshot(Long workspaceId, Long userId) {
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    Map<Long, String> memberNames = new LinkedHashMap<>();

    if (dashboard.getOwnerId() != null) {
      memberNames.put(dashboard.getOwnerId(), Objects.toString(dashboard.getOwnerName(), "오너"));
    }

    if (dashboard.getMembers() != null) {
      dashboard
          .getMembers()
          .forEach(
              member ->
                  memberNames.put(
                      member.getLearnerId(), Objects.toString(member.getLearnerName(), "팀원")));
    }

    List<MeetingNoteResponse> notes = workspaceDocService.getMeetingNotes(workspaceId, userId);
    // AI에게 본문이 온전히 실린 회의록만 교체를 허용한다(Collector와 같은 기준).
    Set<Long> editableNoteIds =
        notes.stream()
            .limit(WorkspaceAiContextCollector.MAX_MEETING_NOTE_BODIES)
            .filter(
                note ->
                    note.getContent() == null
                        || note.getContent().trim().length()
                            <= WorkspaceAiContextCollector.MAX_DOC_LENGTH)
            .map(MeetingNoteResponse::getNoteId)
            .collect(Collectors.toSet());
    WorkspaceDocResponse apiSpec =
        workspaceDocService.getDoc(workspaceId, userId, WorkspaceDocType.API_SPEC);
    String erdCode = workspaceErdDocumentService.findMermaidCodeForRead(workspaceId, userId);

    return new Snapshot(
        indexBy(workspaceTaskService.getTasks(workspaceId, userId), WorkspaceTaskResponse::getTaskId),
        indexBy(
            calendarEventService.getEvents(workspaceId, userId, null, null),
            CalendarEventResponse::getEventId),
        indexBy(
            milestoneService.getMilestones(workspaceId, userId), MilestoneResponse::getMilestoneId),
        indexBy(notes, MeetingNoteResponse::getNoteId),
        editableNoteIds,
        memberNames,
        erdCode == null ? "" : erdCode.trim(),
        apiSpec == null || apiSpec.getContent() == null ? "" : apiSpec.getContent().trim());
  }

  private record Snapshot(
      Map<Long, WorkspaceTaskResponse> tasks,
      Map<Long, CalendarEventResponse> events,
      Map<Long, MilestoneResponse> milestones,
      Map<Long, MeetingNoteResponse> notes,
      Set<Long> editableNoteIds,
      Map<Long, String> memberNames,
      String erdCode,
      String apiSpec) {}

  // ── 보조 ──

  /** AI 응답 한 건을 제안 객체로 바꾼다. 빈 문자열은 값 없음으로 보고, 형식이 틀리면 버린다. */
  private WorkspaceAiAction parse(JsonNode actionNode) {
    if (!actionNode.isObject()) {
      return null;
    }

    ObjectNode cleaned = ((ObjectNode) actionNode).deepCopy();
    cleaned
        .properties()
        .removeIf(
            field ->
                field.getValue().isNull()
                    || (field.getValue().isTextual() && !StringUtils.hasText(field.getValue().asText())));

    try {
      return objectMapper.treeToValue(cleaned, WorkspaceAiAction.class);
    } catch (Exception e) {
      log.info("[WorkspaceAiActionService] 제안 형식 오류로 제외: {}", e.getMessage());
      return null;
    }
  }

  private String targetKey(WorkspaceAiAction action) {
    return switch (action.getType()) {
      case TASK_UPDATE, TASK_DELETE -> "TASK:" + action.getTargetId();
      case EVENT_UPDATE, EVENT_DELETE -> "EVENT:" + action.getTargetId();
      case MILESTONE_UPDATE, MILESTONE_DELETE -> "MILESTONE:" + action.getTargetId();
      case MEETING_NOTE_UPDATE, MEETING_NOTE_DELETE -> "MEETING_NOTE:" + action.getTargetId();
      case ERD_UPDATE -> "ERD";
      case API_SPEC_UPDATE -> "API_SPEC";
      default -> null;
    };
  }

  private WorkspaceAiAction onlyTarget(WorkspaceAiAction action, String summary) {
    return WorkspaceAiAction.builder()
        .type(action.getType())
        .targetId(action.getTargetId())
        .summary(summary)
        .build();
  }

  private <T> T require(Map<Long, T> items, Long id, String label) {
    T item = id == null ? null : items.get(id);

    if (item == null) {
      throw new InvalidActionException(label + "을(를) 찾을 수 없습니다.");
    }

    return item;
  }

  private Long requireMemberOrNull(Snapshot snapshot, Long memberId) {
    if (memberId != null && !snapshot.memberNames().containsKey(memberId)) {
      throw new InvalidActionException("담당자가 이 워크스페이스 팀원이 아닙니다.");
    }

    return memberId;
  }

  private void requireFullyVisible(String current, int maxLength, String label) {
    if (current.length() > maxLength) {
      throw new InvalidActionException(label + "가 길어 AI가 전체를 확인하지 못했으므로 교체할 수 없습니다.");
    }
  }

  private <T extends Comparable<? super T>> void requireOrder(T start, T end, String message) {
    if (start != null && end != null && end.compareTo(start) < 0) {
      throw new InvalidActionException(message);
    }
  }

  private void requireChanges(List<String> changes) {
    if (changes.isEmpty()) {
      throw new InvalidActionException("변경 사항이 없습니다.");
    }
  }

  private <T> void addChange(
      List<String> changes, String label, T before, T after, Function<T, String> format) {
    if (!Objects.equals(before, after)) {
      changes.add(
          String.format(
              "%s %s → %s",
              label,
              before == null ? "없음" : format.apply(before),
              after == null ? "없음" : format.apply(after)));
    }
  }

  private <E extends Enum<E>> E parseEnum(Class<E> enumType, String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }

    try {
      return Enum.valueOf(enumType, value.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new InvalidActionException("알 수 없는 값입니다: " + value);
    }
  }

  /** 기존 요청 DTO를 컨트롤러와 같은 Jackson 규칙으로 만들고, 같은 Bean Validation 제약으로 검사한다. */
  private <T> T validate(Class<T> requestType, Map<String, Object> values) {
    T request = convert(requestType, values);
    Set<ConstraintViolation<T>> violations = validator.validate(request);

    if (!violations.isEmpty()) {
      ConstraintViolation<T> violation = violations.iterator().next();
      throw new InvalidActionException(violation.getPropertyPath() + " " + violation.getMessage());
    }

    return request;
  }

  private <T> T convert(Class<T> requestType, Map<String, Object> values) {
    return objectMapper.convertValue(values, requestType);
  }

  // Map.of는 null 값을 허용하지 않아 직접 만든다.
  private Map<String, Object> fields(Object... keyValues) {
    Map<String, Object> values = new HashMap<>();

    for (int i = 0; i < keyValues.length; i += 2) {
      values.put((String) keyValues[i], keyValues[i + 1]);
    }

    return values;
  }

  private <T> Map<Long, T> indexBy(List<T> items, Function<T, Long> idGetter) {
    Map<Long, T> indexed = new LinkedHashMap<>();
    items.forEach(item -> indexed.put(idGetter.apply(item), item));
    return indexed;
  }

  // Objects.requireNonNullElse와 달리 둘 다 null이면 null을 돌려준다(마감일 없는 작업 등).
  private <T> T firstNonNull(T preferred, T fallback) {
    return preferred != null ? preferred : fallback;
  }

  private String firstText(String preferred, String fallback) {
    return StringUtils.hasText(preferred) ? preferred.trim() : fallback;
  }

  private String formatRange(LocalDateTime startAt, LocalDateTime endAt) {
    return startAt.format(DATE_TIME) + " ~ " + endAt.format(DATE_TIME);
  }

  private String formatDateRange(LocalDate startDate, LocalDate dueDate) {
    return (startDate == null ? "" : startDate.format(DATE) + " ~ ") + "마감 " + dueDate.format(DATE);
  }

  private String truncate(String value, int maxLength) {
    return value.length() <= maxLength ? value : value.substring(0, maxLength);
  }

  /** 제안이 현재 데이터와 맞지 않을 때. 제안 단계에선 그 건만 버리고, 실행 단계에선 400으로 바꿔 전체를 막는다. */
  private static class InvalidActionException extends RuntimeException {

    InvalidActionException(String message) {
      super(message);
    }
  }
}
package com.devpath.api.workspace.service;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.workspace.dto.CreateTaskRequest;
import com.devpath.api.workspace.dto.KanbanBoardResponse;
import com.devpath.api.workspace.dto.UpdateTaskAssigneeRequest;
import com.devpath.api.workspace.dto.UpdateTaskRequest;
import com.devpath.api.workspace.dto.UpdateTaskStatusRequest;
import com.devpath.api.workspace.dto.WorkspaceTaskResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceTaskService {

  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final NotificationEventService notificationEventService;
  private final WorkspaceAiDesignRepository workspaceAiDesignRepository;
  private final ObjectMapper objectMapper;

  @Transactional
  public WorkspaceTaskResponse createTask(
      Long workspaceId, Long userId, CreateTaskRequest request) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    WorkspaceTaskPriority priority =
        request.getPriority() != null ? request.getPriority() : WorkspaceTaskPriority.MEDIUM;

    WorkspaceTask task =
        WorkspaceTask.builder()
            .workspaceId(workspaceId)
            .title(request.getTitle())
            .description(request.getDescription())
            .priority(priority)
            .assigneeId(request.getAssigneeId())
            .dueDate(request.getDueDate())
            .createdById(userId)
            .build();

    task.changeFeatureIds(validateFeatureIds(workspaceId, request.getFeatureIds()));

    return WorkspaceTaskResponse.from(workspaceTaskRepository.save(task));
  }

  public KanbanBoardResponse getKanbanBoard(Long workspaceId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    List<WorkspaceTask> all =
        workspaceTaskRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
            workspaceId);

    List<WorkspaceTaskResponse> todo =
        all.stream()
            .filter(t -> t.getStatus() == WorkspaceTaskStatus.TODO)
            .map(WorkspaceTaskResponse::from)
            .toList();

    List<WorkspaceTaskResponse> inProgress =
        all.stream()
            .filter(t -> t.getStatus() == WorkspaceTaskStatus.IN_PROGRESS)
            .map(WorkspaceTaskResponse::from)
            .toList();

    List<WorkspaceTaskResponse> inReview =
        all.stream()
            .filter(t -> t.getStatus() == WorkspaceTaskStatus.IN_REVIEW)
            .map(WorkspaceTaskResponse::from)
            .toList();

    List<WorkspaceTaskResponse> done =
        all.stream()
            .filter(t -> t.getStatus() == WorkspaceTaskStatus.DONE)
            .map(WorkspaceTaskResponse::from)
            .toList();

    return KanbanBoardResponse.builder()
        .workspaceId(workspaceId)
        .todo(todo)
        .inProgress(inProgress)
        .inReview(inReview)
        .done(done)
        .build();
  }

  public List<WorkspaceTaskResponse> getTasks(Long workspaceId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    return workspaceTaskRepository
        .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId)
        .stream()
        .map(WorkspaceTaskResponse::from)
        .toList();
  }

  public WorkspaceTaskResponse getTask(Long workspaceId, Long taskId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    WorkspaceTask task = getTaskEntity(taskId);
    validateTaskBelongsToWorkspace(task, workspaceId);
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public WorkspaceTaskResponse updateTask(
      Long workspaceId, Long taskId, Long userId, UpdateTaskRequest request) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    WorkspaceTask task = getTaskEntity(taskId);
    validateTaskBelongsToWorkspace(task, workspaceId);

    WorkspaceTaskPriority priority =
        request.getPriority() != null ? request.getPriority() : task.getPriority();

    task.update(request.getTitle(), request.getDescription(), priority, request.getDueDate());
    if (request.getFeatureIds() != null) {
      task.changeFeatureIds(validateFeatureIds(workspaceId, request.getFeatureIds()));
    }
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public WorkspaceTaskResponse updateTaskById(Long taskId, Long userId, UpdateTaskRequest request) {
    WorkspaceTask task = getTaskEntity(taskId);
    Long workspaceId = task.getWorkspaceId();
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    WorkspaceTaskPriority priority =
        request.getPriority() != null ? request.getPriority() : task.getPriority();

    task.update(request.getTitle(), request.getDescription(), priority, request.getDueDate());
    if (request.getFeatureIds() != null) {
      task.changeFeatureIds(validateFeatureIds(workspaceId, request.getFeatureIds()));
    }
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public WorkspaceTaskResponse updateTaskStatus(
      Long workspaceId, Long taskId, Long userId, UpdateTaskStatusRequest request) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    WorkspaceTask task = getTaskEntity(taskId);
    validateTaskBelongsToWorkspace(task, workspaceId);

    task.changeStatus(request.getStatus());
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public WorkspaceTaskResponse updateTaskStatusById(
      Long taskId, Long userId, UpdateTaskStatusRequest request) {
    WorkspaceTask task = getTaskEntity(taskId);
    Long workspaceId = task.getWorkspaceId();
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    task.changeStatus(request.getStatus());
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public WorkspaceTaskResponse updateTaskAssignee(
      Long workspaceId, Long taskId, Long userId, UpdateTaskAssigneeRequest request) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    WorkspaceTask task = getTaskEntity(taskId);
    validateTaskBelongsToWorkspace(task, workspaceId);

    Long newAssigneeId = request.getAssigneeId();
    boolean assigneeChanged = !Objects.equals(task.getAssigneeId(), newAssigneeId);
    task.changeAssignee(newAssigneeId);
    if (assigneeChanged && newAssigneeId != null) {
      notificationEventService.notifySystem(
          newAssigneeId, "칸반 태스크 담당자로 배정되었습니다: " + task.getTitle());
    }
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public WorkspaceTaskResponse updateTaskAssigneeById(
      Long taskId, Long userId, UpdateTaskAssigneeRequest request) {
    WorkspaceTask task = getTaskEntity(taskId);
    Long workspaceId = task.getWorkspaceId();
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    Long newAssigneeId = request.getAssigneeId();
    boolean assigneeChanged = !Objects.equals(task.getAssigneeId(), newAssigneeId);
    task.changeAssignee(newAssigneeId);
    if (assigneeChanged && newAssigneeId != null) {
      notificationEventService.notifySystem(
          newAssigneeId, "칸반 태스크 담당자로 배정되었습니다: " + task.getTitle());
    }
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public void deleteTask(Long workspaceId, Long taskId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    WorkspaceTask task = getTaskEntity(taskId);
    validateTaskBelongsToWorkspace(task, workspaceId);

    task.delete();
  }

  @Transactional
  public void deleteTaskById(Long taskId, Long userId) {
    WorkspaceTask task = getTaskEntity(taskId);
    Long workspaceId = task.getWorkspaceId();
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    task.delete();
  }

  public List<WorkspaceTaskResponse> getUnresolvedTasks(Long workspaceId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    return workspaceTaskRepository
        .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId)
        .stream()
        .filter(t -> t.getStatus() != WorkspaceTaskStatus.DONE)
        .map(WorkspaceTaskResponse::from)
        .toList();
  }

  public long countUnresolvedByWorkspaceId(Long workspaceId) {
    return workspaceTaskRepository.countByWorkspaceIdAndStatusNotAndIsDeletedFalse(
        workspaceId, WorkspaceTaskStatus.DONE);
  }

  public long countUnresolvedByWorkspaceIds(List<Long> workspaceIds) {
    if (workspaceIds.isEmpty()) {
      return 0;
    }
    return workspaceTaskRepository.countByWorkspaceIdInAndStatusNotAndIsDeletedFalse(
        workspaceIds, WorkspaceTaskStatus.DONE);
  }

  // --- 내부 헬퍼 ---

  private List<String> validateFeatureIds(Long workspaceId, List<String> featureIds) {
    if (featureIds == null || featureIds.isEmpty()) {
      return List.of();
    }
    // 기능 연결 저장과 설계의 기능 삭제가 동시에 진행되지 않도록 같은 설계 행을 잠근다.
    var design =
        workspaceAiDesignRepository
            .findForUpdateByWorkspaceId(workspaceId)
            .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT_VALUE));
    try {
      var scenario = objectMapper.readTree(design.getDesignJson()).path("scenario");
      var features = scenario.path("coreFeatures");
      var validIds =
          scenario.path("featureIds").isArray()
              ? objectMapper.convertValue(
                  scenario.path("featureIds"),
                  new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {})
              : java.util.stream.IntStream.rangeClosed(1, features.size())
                  .mapToObj(index -> "F" + index)
                  .toList();
      if (!features.isArray() || featureIds.stream().anyMatch(id -> !validIds.contains(id))) {
        throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
      }
      return featureIds.stream().distinct().toList();
    } catch (JsonProcessingException exception) {
      // 손상된 설계에는 기능 ID를 검증할 수 없으므로 연결을 저장하지 않는다.
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_FAILED);
    }
  }

  private void validateWorkspaceExists(Long workspaceId) {
    workspaceRepository
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

  private WorkspaceTask getTaskEntity(Long taskId) {
    return workspaceTaskRepository
        .findByIdAndIsDeletedFalse(taskId)
        .orElseThrow(() -> new CustomException(ErrorCode.TASK_NOT_FOUND));
  }

  private void validateTaskBelongsToWorkspace(WorkspaceTask task, Long workspaceId) {
    if (!task.getWorkspaceId().equals(workspaceId)) {
      throw new CustomException(ErrorCode.TASK_FORBIDDEN);
    }
  }
}

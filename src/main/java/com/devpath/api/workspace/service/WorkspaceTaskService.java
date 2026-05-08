package com.devpath.api.workspace.service;

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
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.util.List;
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

    List<WorkspaceTaskResponse> done =
        all.stream()
            .filter(t -> t.getStatus() == WorkspaceTaskStatus.DONE)
            .map(WorkspaceTaskResponse::from)
            .toList();

    return KanbanBoardResponse.builder()
        .workspaceId(workspaceId)
        .todo(todo)
        .inProgress(inProgress)
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
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public WorkspaceTaskResponse updateTaskById(
      Long taskId, Long userId, UpdateTaskRequest request) {
    WorkspaceTask task = getTaskEntity(taskId);
    Long workspaceId = task.getWorkspaceId();
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    WorkspaceTaskPriority priority =
        request.getPriority() != null ? request.getPriority() : task.getPriority();

    task.update(request.getTitle(), request.getDescription(), priority, request.getDueDate());
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

    task.changeAssignee(request.getAssigneeId());
    return WorkspaceTaskResponse.from(task);
  }

  @Transactional
  public WorkspaceTaskResponse updateTaskAssigneeById(
      Long taskId, Long userId, UpdateTaskAssigneeRequest request) {
    WorkspaceTask task = getTaskEntity(taskId);
    Long workspaceId = task.getWorkspaceId();
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    task.changeAssignee(request.getAssigneeId());
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

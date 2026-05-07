package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class WorkspaceTaskResponse {

    private Long taskId;
    private Long workspaceId;
    private String title;
    private String description;
    private WorkspaceTaskStatus status;
    private WorkspaceTaskPriority priority;
    private Long assigneeId;
    private LocalDate dueDate;
    private Long createdById;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WorkspaceTaskResponse from(WorkspaceTask task) {
        return WorkspaceTaskResponse.builder()
                .taskId(task.getId())
                .workspaceId(task.getWorkspaceId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .assigneeId(task.getAssigneeId())
                .dueDate(task.getDueDate())
                .createdById(task.getCreatedById())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
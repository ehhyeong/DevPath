package com.devpath.api.workspace.dto;

import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class KanbanBoardResponse {

    private Long workspaceId;
    private List<WorkspaceTaskResponse> todo;
    private List<WorkspaceTaskResponse> inProgress;
    private List<WorkspaceTaskResponse> done;
}
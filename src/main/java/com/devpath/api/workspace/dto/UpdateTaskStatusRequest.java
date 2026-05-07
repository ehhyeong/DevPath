package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateTaskStatusRequest {

    @NotNull
    @Schema(description = "변경할 상태 (TODO, IN_PROGRESS, DONE)", example = "IN_PROGRESS")
    private WorkspaceTaskStatus status;
}
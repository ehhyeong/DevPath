package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateTaskAssigneeRequest {

    @Schema(description = "담당자 ID (null이면 담당자 해제)", example = "2")
    private Long assigneeId;
}
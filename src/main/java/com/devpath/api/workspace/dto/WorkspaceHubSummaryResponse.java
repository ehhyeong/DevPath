package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "워크스페이스 허브 요약 응답 DTO")
public class WorkspaceHubSummaryResponse {

    @Schema(description = "전체 워크스페이스 수", example = "5")
    private long totalWorkspaces;

    @Schema(description = "활성 워크스페이스 수", example = "3")
    private long activeWorkspaces;

    @Schema(description = "전체 미해결 태스크 수", example = "5")
    private long totalUnresolvedTasks;

    @Schema(description = "전체 진행 중 마일스톤 수", example = "3")
    private long totalActiveMilestones;
}
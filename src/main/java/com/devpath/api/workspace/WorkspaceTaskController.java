package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.CreateTaskRequest;
import com.devpath.api.workspace.dto.KanbanBoardResponse;
import com.devpath.api.workspace.dto.UpdateTaskAssigneeRequest;
import com.devpath.api.workspace.dto.UpdateTaskRequest;
import com.devpath.api.workspace.dto.UpdateTaskStatusRequest;
import com.devpath.api.workspace.dto.WorkspaceTaskResponse;
import com.devpath.api.workspace.service.WorkspaceTaskService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Workspace Kanban API", description = "워크스페이스 칸반 태스크 API")
public class WorkspaceTaskController {

    private final WorkspaceTaskService workspaceTaskService;

    @PostMapping("/workspaces/{workspaceId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "태스크 생성", description = "워크스페이스에 새 태스크를 생성합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "생성 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "워크스페이스 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<WorkspaceTaskResponse> createTask(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Valid @RequestBody CreateTaskRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(workspaceTaskService.createTask(workspaceId, requireUserId(userId), request));
    }

    @GetMapping("/workspaces/{workspaceId}/kanban")
    @Operation(summary = "칸반 보드 조회", description = "워크스페이스의 칸반 보드(TODO/IN_PROGRESS/DONE 컬럼)를 조회합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "워크스페이스 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<KanbanBoardResponse> getKanbanBoard(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(workspaceTaskService.getKanbanBoard(workspaceId, requireUserId(userId)));
    }

    @GetMapping("/workspaces/{workspaceId}/tasks/{taskId}")
    @Operation(summary = "태스크 단건 조회", description = "특정 태스크를 조회합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "태스크 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<WorkspaceTaskResponse> getTask(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(workspaceTaskService.getTask(workspaceId, taskId, requireUserId(userId)));
    }

    @PutMapping("/workspaces/{workspaceId}/tasks/{taskId}")
    @Operation(summary = "태스크 수정", description = "태스크 제목, 설명, 우선순위, 마감일을 수정합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "수정 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "태스크 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<WorkspaceTaskResponse> updateTask(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
            @Valid @RequestBody UpdateTaskRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(workspaceTaskService.updateTask(workspaceId, taskId, requireUserId(userId), request));
    }

    @PatchMapping("/workspaces/{workspaceId}/tasks/{taskId}/status")
    @Operation(summary = "태스크 상태 변경", description = "태스크 상태를 TODO/IN_PROGRESS/DONE으로 변경합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "변경 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "태스크 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<WorkspaceTaskResponse> updateTaskStatus(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
            @Valid @RequestBody UpdateTaskStatusRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(
                workspaceTaskService.updateTaskStatus(workspaceId, taskId, requireUserId(userId), request));
    }

    @PatchMapping("/workspaces/{workspaceId}/tasks/{taskId}/assignee")
    @Operation(summary = "태스크 담당자 변경", description = "태스크 담당자를 변경하거나 해제합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "변경 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "태스크 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<WorkspaceTaskResponse> updateTaskAssignee(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
            @RequestBody UpdateTaskAssigneeRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(
                workspaceTaskService.updateTaskAssignee(workspaceId, taskId, requireUserId(userId), request));
    }

    @DeleteMapping("/workspaces/{workspaceId}/tasks/{taskId}")
    @Operation(summary = "태스크 삭제", description = "태스크를 소프트 삭제합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "태스크 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<Void> deleteTask(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        workspaceTaskService.deleteTask(workspaceId, taskId, requireUserId(userId));
        return ApiResponse.ok(null);
    }

    @GetMapping("/workspaces/{workspaceId}/tasks/unresolved")
    @Operation(summary = "워크스페이스 미해결 태스크 조회", description = "DONE이 아닌 태스크 목록을 조회합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<List<WorkspaceTaskResponse>> getUnresolvedTasks(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(workspaceTaskService.getUnresolvedTasks(workspaceId, requireUserId(userId)));
    }
}
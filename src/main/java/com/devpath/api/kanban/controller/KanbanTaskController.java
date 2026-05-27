package com.devpath.api.kanban.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

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
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@Tag(name = "Kanban Task API", description = "A Swagger 시나리오 호환을 위한 태스크 단독 URL API입니다.")
public class KanbanTaskController {

  private final WorkspaceTaskService workspaceTaskService;

  @PatchMapping("/{taskId}")
  @Operation(summary = "태스크 수정", description = "taskId만으로 태스크 제목, 설명, 우선순위, 마감일을 수정합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "태스크 수정 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "워크스페이스 멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "태스크 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceTaskResponse> updateTask(
      @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
      @Valid @RequestBody UpdateTaskRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceTaskService.updateTaskById(taskId, requireUserId(userId), request));
  }

  @PatchMapping("/{taskId}/assignee")
  @Operation(summary = "태스크 담당자 변경", description = "taskId만으로 태스크 담당자를 변경하거나 해제합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "담당자 변경 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "워크스페이스 멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "태스크 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceTaskResponse> updateTaskAssignee(
      @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
      @RequestBody UpdateTaskAssigneeRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceTaskService.updateTaskAssigneeById(taskId, requireUserId(userId), request));
  }

  @PatchMapping("/{taskId}/status")
  @Operation(
      summary = "태스크 상태 변경",
      description = "taskId만으로 태스크 상태를 TODO, IN_PROGRESS, DONE 중 하나로 변경합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "상태 변경 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "워크스페이스 멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "태스크 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceTaskResponse> updateTaskStatus(
      @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
      @Valid @RequestBody UpdateTaskStatusRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceTaskService.updateTaskStatusById(taskId, requireUserId(userId), request));
  }

  @DeleteMapping("/{taskId}")
  @Operation(summary = "태스크 삭제", description = "taskId만으로 태스크를 soft delete 처리합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "태스크 삭제 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "워크스페이스 멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "태스크 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> deleteTask(
      @Parameter(description = "태스크 ID", example = "1") @PathVariable Long taskId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    workspaceTaskService.deleteTaskById(taskId, requireUserId(userId));
    return ApiResponse.ok();
  }
}

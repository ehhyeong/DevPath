package com.devpath.api.workspace.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceAiActionExecuteRequest;
import com.devpath.api.workspace.dto.WorkspaceAiActionExecuteResponse;
import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.api.workspace.dto.WorkspaceAiAssistResponse;
import com.devpath.api.workspace.service.WorkspaceAiActionService;
import com.devpath.api.workspace.service.WorkspaceAiAssistService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "워크스페이스 AI 비서", description = "스쿼드 워크스페이스 현황을 근거로 답하고, 확인을 거쳐 변경을 실행하는 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceId}/ai-assist")
public class WorkspaceAiAssistController {

  private final WorkspaceAiAssistService workspaceAiAssistService;
  private final WorkspaceAiActionService workspaceAiActionService;

  @Operation(
      summary = "워크스페이스 AI 비서 질문",
      description = "워크스페이스의 작업·일정·마일스톤·파일 목록·ERD·팀 문서를 근거로 질문에 답합니다. 변경 요청이면 변경 제안(actions)을 함께 돌려주며, 이 요청 자체는 데이터를 변경하지 않습니다.")
  @PostMapping
  public ApiResponse<WorkspaceAiAssistResponse> ask(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody WorkspaceAiAssistRequest request) {
    return ApiResponse.ok(
        workspaceAiAssistService.ask(workspaceId, requireUserId(userId), request));
  }

  @Operation(
      summary = "AI 변경 제안 실행",
      description = "팀원이 확인한 AI 변경 제안을 다시 검증한 뒤 한 트랜잭션으로 실행합니다. 하나라도 실행할 수 없으면 아무것도 반영하지 않습니다.")
  @PostMapping("/actions")
  public ApiResponse<WorkspaceAiActionExecuteResponse> executeActions(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody WorkspaceAiActionExecuteRequest request) {
    return ApiResponse.ok(
        workspaceAiActionService.execute(workspaceId, requireUserId(userId), request.getActions()));
  }
}
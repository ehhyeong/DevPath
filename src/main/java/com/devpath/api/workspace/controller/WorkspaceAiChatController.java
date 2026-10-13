package com.devpath.api.workspace.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceAiActionExecuteRequest;
import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.api.workspace.dto.WorkspaceAiChatMessageResponse;
import com.devpath.api.workspace.service.WorkspaceAiChatService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "워크스페이스 AI 에이전트 대화", description = "팀원이 함께 쓰는 AI 에이전트 대화를 저장·조회하고, 저장된 변경 제안을 한 번만 실행하는 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceId}/ai-chat/messages")
public class WorkspaceAiChatController {

  private final WorkspaceAiChatService workspaceAiChatService;

  @Operation(summary = "AI 에이전트 대화 조회", description = "워크스페이스 팀원이 함께 쓰는 대화를 오래된 순으로 최근 50개까지 조회합니다.")
  @GetMapping
  public ApiResponse<List<WorkspaceAiChatMessageResponse>> getMessages(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceAiChatService.getMessages(workspaceId, requireUserId(userId)));
  }

  @Operation(
      summary = "AI 에이전트에게 질문",
      description = "워크스페이스 현황을 근거로 답하고, 질문과 답변을 대화에 저장합니다. 변경 제안은 저장만 하고 실행하지 않습니다.")
  @PostMapping
  public ApiResponse<WorkspaceAiChatMessageResponse> ask(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody WorkspaceAiAssistRequest request) {
    return ApiResponse.ok(workspaceAiChatService.ask(workspaceId, requireUserId(userId), request));
  }

  @Operation(
      summary = "AI 변경 제안 실행",
      description = "대화에 저장된 변경 제안을 다시 검증한 뒤 한 트랜잭션으로 실행하고 결과를 대화에 남깁니다. 이미 실행된 제안은 409로 거부합니다.")
  @PostMapping("/{messageId}/actions")
  public ApiResponse<WorkspaceAiChatMessageResponse> executeActions(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "변경 제안이 담긴 AI 답변 메시지 ID", example = "10") @PathVariable Long messageId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody WorkspaceAiActionExecuteRequest request) {
    return ApiResponse.ok(
        workspaceAiChatService.executeActions(
            workspaceId, requireUserId(userId), messageId, request.getActions()));
  }

  @Operation(summary = "AI 에이전트 대화 비우기", description = "워크스페이스 팀원 모두의 대화를 비웁니다.")
  @DeleteMapping
  public ApiResponse<Void> clearMessages(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    workspaceAiChatService.clearMessages(workspaceId, requireUserId(userId));
    return ApiResponse.ok();
  }
}

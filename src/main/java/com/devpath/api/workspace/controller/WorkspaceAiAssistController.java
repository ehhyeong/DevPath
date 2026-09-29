package com.devpath.api.workspace.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.api.workspace.dto.WorkspaceAiAssistResponse;
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

@Tag(name = "워크스페이스 AI 비서", description = "스쿼드 워크스페이스 현황을 조회해 자연어로 답하는 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceId}/ai-assist")
public class WorkspaceAiAssistController {

  private final WorkspaceAiAssistService workspaceAiAssistService;

  @Operation(
      summary = "워크스페이스 AI 비서 질문",
      description = "워크스페이스의 작업·일정·마일스톤·파일 목록·ERD·팀 문서를 근거로 질문에 답합니다. 조회만 하며 데이터를 변경하지 않습니다.")
  @PostMapping
  public ApiResponse<WorkspaceAiAssistResponse> ask(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody WorkspaceAiAssistRequest request) {
    return ApiResponse.ok(
        workspaceAiAssistService.ask(workspaceId, requireUserId(userId), request));
  }
}
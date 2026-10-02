package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiAction;
import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.api.workspace.dto.WorkspaceAiAssistResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

// Collector와 같은 이유로 트랜잭션을 열지 않는다.
@Service
@RequiredArgsConstructor
public class WorkspaceAiAssistService {

  private final WorkspaceAiContextCollector workspaceAiContextCollector;
  private final WorkspaceAiAssistClient workspaceAiAssistClient;
  private final WorkspaceAiActionService workspaceAiActionService;

  public WorkspaceAiAssistResponse ask(
      Long workspaceId, Long userId, WorkspaceAiAssistRequest request) {
    LocalDate today = LocalDate.now();
    String workspaceContext = workspaceAiContextCollector.collect(workspaceId, userId, today);
    JsonNode root =
        workspaceAiAssistClient.answer(
            request.getQuestion(), request.getHistory(), workspaceContext, today);
    String answer = root == null ? null : root.path("answer").asText("").trim();

    if (!StringUtils.hasText(answer)) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_ASSIST_FAILED);
    }

    // 변경 제안은 검증만 하고 실행하지 않는다. 실행은 팀원이 확인한 뒤 별도 요청으로 한다.
    List<WorkspaceAiAction> actions =
        workspaceAiActionService.propose(workspaceId, userId, root.path("actions"));
    return WorkspaceAiAssistResponse.of(answer, actions);
  }
}
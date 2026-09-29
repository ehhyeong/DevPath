package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.api.workspace.dto.WorkspaceAiAssistResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

// Collector와 같은 이유로 트랜잭션을 열지 않는다.
@Service
@RequiredArgsConstructor
public class WorkspaceAiAssistService {

  private final WorkspaceAiContextCollector workspaceAiContextCollector;
  private final WorkspaceAiAssistClient workspaceAiAssistClient;

  public WorkspaceAiAssistResponse ask(
      Long workspaceId, Long userId, WorkspaceAiAssistRequest request) {
    LocalDate today = LocalDate.now();
    String workspaceContext = workspaceAiContextCollector.collect(workspaceId, userId, today);
    String answer =
        workspaceAiAssistClient.answer(
            request.getQuestion(), request.getHistory(), workspaceContext, today);

    if (!StringUtils.hasText(answer)) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_ASSIST_FAILED);
    }

    return WorkspaceAiAssistResponse.of(answer);
  }
}
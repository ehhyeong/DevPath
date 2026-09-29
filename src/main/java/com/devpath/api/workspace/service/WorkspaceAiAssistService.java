package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.api.workspace.dto.WorkspaceAiAssistResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
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
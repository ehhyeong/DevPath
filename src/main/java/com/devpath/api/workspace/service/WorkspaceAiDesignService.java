package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiQuotaExceededException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WorkspaceAiDesignService {

  private final WorkspaceAiDesignClient workspaceAiDesignClient;

  public WorkspaceAiDesignResponse generate(WorkspaceAiDesignRequest request) {
    WorkspaceAiDesignResponse response;
    try {
      response = workspaceAiDesignClient.generate(request);
    } catch (GeminiQuotaExceededException exception) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_QUOTA_EXCEEDED);
    }
    if (response == null) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_FAILED);
    }
    return response;
  }
}

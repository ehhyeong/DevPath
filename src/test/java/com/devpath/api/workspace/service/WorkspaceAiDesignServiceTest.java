package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiQuotaExceededException;
import org.junit.jupiter.api.Test;

class WorkspaceAiDesignServiceTest {

  @Test
  void convertsQuotaExceededToTooManyRequestsError() {
    WorkspaceAiDesignClient client = mock(WorkspaceAiDesignClient.class);
    WorkspaceAiDesignRequest request =
        new WorkspaceAiDesignRequest("mvp", "auto", null, null, null, null);
    when(client.generate(request)).thenThrow(new GeminiQuotaExceededException());
    WorkspaceAiDesignService service = new WorkspaceAiDesignService(client);

    assertThatThrownBy(() -> service.generate(request))
        .isInstanceOf(CustomException.class)
        .satisfies(
            exception ->
                assertThat(((CustomException) exception).getErrorCode())
                    .isEqualTo(ErrorCode.WORKSPACE_AI_QUOTA_EXCEEDED));
  }

  @Test
  void convertsMissingAiResultToServiceUnavailableError() {
    WorkspaceAiDesignClient client = mock(WorkspaceAiDesignClient.class);
    WorkspaceAiDesignRequest request =
        new WorkspaceAiDesignRequest("mvp", "auto", null, null, null, null);
    when(client.generate(request)).thenReturn(null);
    WorkspaceAiDesignService service = new WorkspaceAiDesignService(client);

    assertThatThrownBy(() -> service.generate(request))
        .isInstanceOf(CustomException.class)
        .satisfies(
            exception ->
                assertThat(((CustomException) exception).getErrorCode())
                    .isEqualTo(ErrorCode.WORKSPACE_AI_DESIGN_FAILED));
  }
}

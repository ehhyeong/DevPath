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
  void ordinaryAccountUsesRealGenerator() {
    var client = mock(WorkspaceAiDesignClient.class);
    var demo = mock(WorkspaceDemoScenario.class);
    var request = new WorkspaceAiDesignRequest("mvp", "auto", null, null, null, null);
    var result = mock(com.devpath.api.workspace.dto.WorkspaceAiDesignResponse.class);
    when(client.generate(request)).thenReturn(result);
    assertThat(new WorkspaceAiDesignService(client, demo).generate(19L, request)).isSameAs(result);
    org.mockito.Mockito.verify(demo, org.mockito.Mockito.never()).design(request);
  }

  @Test
  void convertsQuotaExceededToTooManyRequestsError() {
    WorkspaceAiDesignClient client = mock(WorkspaceAiDesignClient.class);
    WorkspaceAiDesignRequest request =
        new WorkspaceAiDesignRequest("mvp", "auto", null, null, null, null);
    when(client.generate(request)).thenThrow(new GeminiQuotaExceededException());
    WorkspaceAiDesignService service =
        new WorkspaceAiDesignService(client, mock(WorkspaceDemoScenario.class));

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
    WorkspaceAiDesignService service =
        new WorkspaceAiDesignService(client, mock(WorkspaceDemoScenario.class));

    assertThatThrownBy(() -> service.generate(request))
        .isInstanceOf(CustomException.class)
        .satisfies(
            exception ->
                assertThat(((CustomException) exception).getErrorCode())
                    .isEqualTo(ErrorCode.WORKSPACE_AI_DESIGN_FAILED));
  }
}

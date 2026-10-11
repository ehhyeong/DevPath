package com.devpath.api.workspace.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WorkspaceAiDesignJobRunnerTest {

  @Test
  void storesCompletedResultWhenGenerationSucceeds() {
    WorkspaceAiDesignService designService = mock(WorkspaceAiDesignService.class);
    WorkspaceAiDesignJobStore store = mock(WorkspaceAiDesignJobStore.class);
    UUID jobId = UUID.randomUUID();
    WorkspaceAiDesignRequest request = request();
    WorkspaceAiDesignResponse result = response();
    when(store.markProcessing(jobId)).thenReturn(true);
    when(designService.generate(request)).thenReturn(result);

    new WorkspaceAiDesignJobRunner(designService, store).run(jobId, request);

    verify(store).complete(jobId, result);
  }

  @Test
  void storesFailureMessageWhenGenerationFails() {
    WorkspaceAiDesignService designService = mock(WorkspaceAiDesignService.class);
    WorkspaceAiDesignJobStore store = mock(WorkspaceAiDesignJobStore.class);
    UUID jobId = UUID.randomUUID();
    WorkspaceAiDesignRequest request = request();
    when(store.markProcessing(jobId)).thenReturn(true);
    when(designService.generate(request)).thenThrow(new IllegalStateException("Gemini 응답 없음"));

    new WorkspaceAiDesignJobRunner(designService, store).run(jobId, request);

    verify(store).fail(jobId, "Gemini 응답 없음");
  }

  private WorkspaceAiDesignRequest request() {
    return new WorkspaceAiDesignRequest("mvp", "auto", null, null, null, null);
  }

  private WorkspaceAiDesignResponse response() {
    return new WorkspaceAiDesignResponse(
        "예약 플랫폼",
        "예약을 관리합니다.",
        "mvp",
        new WorkspaceAiDesignResponse.RecommendedStack(
            "React", "Spring Boot", "PostgreSQL", List.of("Redis"), "정합성"),
        new WorkspaceAiDesignResponse.Scenario(
            List.of(new WorkspaceAiDesignResponse.UserFlow("사용자", "예약합니다.")), List.of("예약")),
        new WorkspaceAiDesignResponse.Architecture(
            "모듈형 모놀리스", "도메인 분리", List.of(), "erDiagram", List.of(), List.of()),
        List.of(),
        List.of(),
        List.of());
  }
}

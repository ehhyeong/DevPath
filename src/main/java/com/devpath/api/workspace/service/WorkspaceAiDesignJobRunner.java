package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class WorkspaceAiDesignJobRunner {

  private final WorkspaceAiDesignService workspaceAiDesignService;
  private final WorkspaceAiDesignJobStore jobStore;

  @Async
  public void run(UUID jobId, WorkspaceAiDesignRequest request) {
    // DB의 조건부 상태 전이로 여러 서버가 복구 작업을 동시에 발견해도 한 서버만 Gemini를 호출한다.
    if (!jobStore.markProcessing(jobId)) {
      return;
    }
    try {
      Long userId = jobStore.find(jobId).orElseThrow().getUserId();
      WorkspaceAiDesignResponse result = workspaceAiDesignService.generate(userId, request);
      jobStore.complete(jobId, result);
    } catch (Exception exception) {
      // 외부 AI 호출 실패를 비동기 스레드 밖으로 유실하지 않고 조회 가능한 작업 실패 상태로 변환한다.
      String message =
          exception.getMessage() == null || exception.getMessage().isBlank()
              ? "AI 프로젝트 설계를 생성하지 못했습니다."
              : exception.getMessage();
      jobStore.fail(jobId, message);
    }
  }
}

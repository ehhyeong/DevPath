package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiDesignJobResponse;
import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.WorkspaceAiDesignJob;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WorkspaceAiDesignJobService {

  private static final Duration PROCESSING_LEASE = Duration.ofMinutes(10);

  private final WorkspaceAiDesignJobStore jobStore;
  private final WorkspaceAiDesignJobRunner jobRunner;

  public synchronized WorkspaceAiDesignJobResponse create(
      Long userId, WorkspaceAiDesignRequest request) {
    WorkspaceAiDesignJob activeJob = jobStore.findActiveByUserId(userId).orElse(null);
    if (activeJob != null) {
      return toResponse(activeJob);
    }

    WorkspaceAiDesignJob state;
    try {
      state = jobStore.create(userId, request);
    } catch (DataIntegrityViolationException exception) {
      state = jobStore.findActiveByUserId(userId).orElseThrow(() -> exception);
      return toResponse(state);
    }
    jobRunner.run(state.getId(), request);
    return toResponse(state);
  }

  public WorkspaceAiDesignJobResponse get(Long userId, String jobId) {
    UUID parsedJobId;
    try {
      parsedJobId = UUID.fromString(jobId);
    } catch (IllegalArgumentException exception) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_JOB_NOT_FOUND);
    }

    WorkspaceAiDesignJob state =
        jobStore
            .find(parsedJobId)
            .filter(found -> found.getUserId().equals(userId))
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_JOB_NOT_FOUND));
    return toResponse(state);
  }

  @EventListener(ApplicationReadyEvent.class)
  public void resumeUnfinishedJobs() {
    recoverUnfinishedJobs();
  }

  @Scheduled(fixedDelayString = "${app.workspace.ai-design.recovery-delay-ms:60000}")
  public void recoverUnfinishedJobs() {
    jobStore
        .findRecoverableJobs(Instant.now().minus(PROCESSING_LEASE))
        .forEach(job -> jobRunner.run(job.getId(), jobStore.readRequest(job)));
  }

  private WorkspaceAiDesignJobResponse toResponse(WorkspaceAiDesignJob state) {
    return new WorkspaceAiDesignJobResponse(
        state.getId().toString(),
        state.getStatus().name(),
        jobStore.readResult(state),
        state.getErrorMessage(),
        state.getCreatedAt(),
        state.getCompletedAt());
  }
}

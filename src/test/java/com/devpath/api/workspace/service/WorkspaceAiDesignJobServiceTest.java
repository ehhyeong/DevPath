package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceAiDesignJobResponse;
import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.domain.workspace.entity.WorkspaceAiDesignJob;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class WorkspaceAiDesignJobServiceTest {

  @Test
  void createsPendingJobAndStartsAsyncRunner() {
    WorkspaceAiDesignJobStore store = mock(WorkspaceAiDesignJobStore.class);
    WorkspaceAiDesignJobRunner runner = mock(WorkspaceAiDesignJobRunner.class);
    WorkspaceAiDesignRequest request = request();
    WorkspaceAiDesignJob job = new WorkspaceAiDesignJob(7L, "{}");
    when(store.findActiveByUserId(7L)).thenReturn(Optional.empty());
    when(store.create(7L, request)).thenReturn(job);
    WorkspaceAiDesignJobService service = new WorkspaceAiDesignJobService(store, runner);

    WorkspaceAiDesignJobResponse response = service.create(7L, request);

    assertThat(response.status()).isEqualTo("PENDING");
    verify(runner).run(job.getId(), request);
  }

  @Test
  void returnsExistingJobWhenSameUserAlreadyHasActiveJob() {
    WorkspaceAiDesignJobStore store = mock(WorkspaceAiDesignJobStore.class);
    WorkspaceAiDesignJobRunner runner = mock(WorkspaceAiDesignJobRunner.class);
    WorkspaceAiDesignJob job = new WorkspaceAiDesignJob(7L, "{}");
    when(store.findActiveByUserId(7L)).thenReturn(Optional.of(job));
    WorkspaceAiDesignJobService service = new WorkspaceAiDesignJobService(store, runner);

    WorkspaceAiDesignJobResponse response = service.create(7L, request());

    assertThat(response.jobId()).isEqualTo(job.getId().toString());
    verify(runner, never()).run(job.getId(), request());
  }

  @Test
  void returnsJobCreatedByAnotherServerWhenActiveJobInsertRaces() {
    WorkspaceAiDesignJobStore store = mock(WorkspaceAiDesignJobStore.class);
    WorkspaceAiDesignJobRunner runner = mock(WorkspaceAiDesignJobRunner.class);
    WorkspaceAiDesignRequest request = request();
    WorkspaceAiDesignJob concurrentJob = new WorkspaceAiDesignJob(7L, "{}");
    when(store.findActiveByUserId(7L))
        .thenReturn(Optional.empty())
        .thenReturn(Optional.of(concurrentJob));
    when(store.create(7L, request)).thenThrow(new DataIntegrityViolationException("duplicate"));
    WorkspaceAiDesignJobService service = new WorkspaceAiDesignJobService(store, runner);

    WorkspaceAiDesignJobResponse response = service.create(7L, request);

    assertThat(response.jobId()).isEqualTo(concurrentJob.getId().toString());
    verify(runner, never()).run(concurrentJob.getId(), request);
  }

  @Test
  void submitsRecoverableDatabaseJobs() {
    WorkspaceAiDesignJobStore store = mock(WorkspaceAiDesignJobStore.class);
    WorkspaceAiDesignJobRunner runner = mock(WorkspaceAiDesignJobRunner.class);
    WorkspaceAiDesignJob job = new WorkspaceAiDesignJob(7L, "{}");
    WorkspaceAiDesignRequest request = request();
    when(store.findRecoverableJobs(org.mockito.ArgumentMatchers.any(Instant.class)))
        .thenReturn(List.of(job));
    when(store.readRequest(job)).thenReturn(request);
    WorkspaceAiDesignJobService service = new WorkspaceAiDesignJobService(store, runner);

    service.recoverUnfinishedJobs();

    verify(runner).run(job.getId(), request);
  }

  private WorkspaceAiDesignRequest request() {
    return new WorkspaceAiDesignRequest("mvp", "auto", null, null, null, null);
  }
}

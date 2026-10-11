package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.domain.workspace.entity.WorkspaceAiDesignJob;
import com.devpath.domain.workspace.entity.WorkspaceAiDesignJobStatus;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignJobRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
class WorkspaceAiDesignJobStore {

  private static final Duration CACHE_TTL = Duration.ofHours(24);

  private final WorkspaceAiDesignJobRepository repository;
  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;

  @Transactional
  WorkspaceAiDesignJob create(Long userId, WorkspaceAiDesignRequest request) {
    WorkspaceAiDesignJob job =
        repository.save(new WorkspaceAiDesignJob(userId, writeJson(request)));
    cache(job);
    return job;
  }

  @Transactional(readOnly = true)
  Optional<WorkspaceAiDesignJob> find(UUID jobId) {
    WorkspaceAiDesignJob cached = readCache(jobId);
    if (cached != null) {
      return Optional.of(cached);
    }
    Optional<WorkspaceAiDesignJob> job = repository.findById(jobId);
    job.ifPresent(this::cache);
    return job;
  }

  @Transactional(readOnly = true)
  Optional<WorkspaceAiDesignJob> findActiveByUserId(Long userId) {
    return repository.findFirstByUserIdAndStatusInOrderByCreatedAtDesc(
        userId, List.of(WorkspaceAiDesignJobStatus.PENDING, WorkspaceAiDesignJobStatus.PROCESSING));
  }

  @Transactional
  Optional<WorkspaceAiDesignJob> findOwnedForUpdate(UUID jobId, Long userId) {
    return repository.findOwnedForUpdate(jobId, userId);
  }

  @Transactional
  boolean markProcessing(UUID jobId) {
    boolean claimed = repository.claim(jobId, Instant.now()) == 1;
    if (claimed) {
      repository.findById(jobId).ifPresent(this::cache);
    }
    return claimed;
  }

  @Transactional
  void complete(UUID jobId, WorkspaceAiDesignResponse result) {
    repository
        .findById(jobId)
        .ifPresent(
            job -> {
              job.complete(writeJson(result));
              cache(job);
            });
  }

  @Transactional
  void fail(UUID jobId, String errorMessage) {
    repository
        .findById(jobId)
        .ifPresent(
            job -> {
              job.fail(errorMessage);
              cache(job);
            });
  }

  @Transactional
  List<WorkspaceAiDesignJob> findRecoverableJobs(Instant processingCutoff) {
    repository.resetStaleProcessing(processingCutoff);
    return repository.findAllByStatus(WorkspaceAiDesignJobStatus.PENDING);
  }

  WorkspaceAiDesignRequest readRequest(WorkspaceAiDesignJob job) {
    return readJson(job.getRequestJson(), WorkspaceAiDesignRequest.class);
  }

  WorkspaceAiDesignResponse readResult(WorkspaceAiDesignJob job) {
    return job.getResultJson() == null
        ? null
        : readJson(job.getResultJson(), WorkspaceAiDesignResponse.class);
  }

  private void cache(WorkspaceAiDesignJob job) {
    try {
      redisTemplate.opsForValue().set(cacheKey(job.getId()), writeJson(toCache(job)), CACHE_TTL);
    } catch (RuntimeException exception) {
      // Redis 장애가 AI 작업의 DB 영속화와 조회를 중단시키지 않도록 캐시 실패만 기록한다.
      log.warn("[WorkspaceAiDesignJobStore] Redis cache write failed for job={}", job.getId());
    }
  }

  private CachedJob toCache(WorkspaceAiDesignJob job) {
    return new CachedJob(
        job.getId(),
        job.getUserId(),
        job.getStatus().name(),
        job.getRequestJson(),
        job.getResultJson(),
        job.getErrorMessage(),
        job.getCreatedAt(),
        job.getCompletedAt(),
        job.getProcessingStartedAt());
  }

  private WorkspaceAiDesignJob readCache(UUID jobId) {
    try {
      String value = redisTemplate.opsForValue().get(cacheKey(jobId));
      if (value == null) {
        return null;
      }
      CachedJob cached = readJson(value, CachedJob.class);
      return WorkspaceAiDesignJob.restore(
          cached.jobId(),
          cached.userId(),
          WorkspaceAiDesignJobStatus.valueOf(cached.status()),
          cached.requestJson(),
          cached.resultJson(),
          cached.errorMessage(),
          cached.createdAt(),
          cached.completedAt(),
          cached.processingStartedAt());
    } catch (RuntimeException exception) {
      // 손상되거나 접근할 수 없는 캐시는 버리고 DB 원본으로 복구한다.
      log.warn("[WorkspaceAiDesignJobStore] Redis cache read failed for job={}", jobId);
      return null;
    }
  }

  private String cacheKey(UUID jobId) {
    return "workspace:ai-design:job:" + jobId;
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("AI 설계 작업 데이터를 저장하지 못했습니다.", exception);
    }
  }

  private <T> T readJson(String value, Class<T> type) {
    try {
      return objectMapper.readValue(value, type);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("저장된 AI 설계 작업 데이터를 읽지 못했습니다.", exception);
    }
  }

  private record CachedJob(
      UUID jobId,
      Long userId,
      String status,
      String requestJson,
      String resultJson,
      String errorMessage,
      java.time.Instant createdAt,
      java.time.Instant completedAt,
      java.time.Instant processingStartedAt) {}
}

package com.devpath.api.recommendation.service;

import java.time.Duration;
import java.util.Optional;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

// 비동기 추천 생성 작업의 진행 상태를 Redis에 저장·조회한다.
@Service
@RequiredArgsConstructor
public class RecommendationStatusService {

  public static final String RUNNING = "RUNNING";
  public static final String DONE = "DONE";
  public static final String FAILED = "FAILED";
  public static final String IDLE = "IDLE";

  private static final String STATUS_PREFIX = "recommend:status:";
  // 생성이 길어져도 RUNNING이 유지되도록 넉넉히 잡는다. 만료=작업 종료로 간주한다.
  private static final Duration RUNNING_TTL = Duration.ofMinutes(15);
  // 결과(DONE/FAILED)는 클라이언트가 곧 읽어가므로 짧게 유지한다.
  private static final Duration RESULT_TTL = Duration.ofMinutes(5);

  private final StringRedisTemplate stringRedisTemplate;

  // 추천 생성 시작을 기록한다.
  public void markRunning(Long userId, Long nodeId) {
    save(userId, RUNNING, nodeId, 0, RUNNING_TTL);
  }

  // 추천 생성 완료(생성 건수 포함)를 기록한다.
  public void markDone(Long userId, Long nodeId, int count) {
    save(userId, DONE, nodeId, count, RESULT_TTL);
  }

  // 추천 생성 실패를 기록한다.
  public void markFailed(Long userId, Long nodeId) {
    save(userId, FAILED, nodeId, 0, RESULT_TTL);
  }

  // 현재 사용자의 추천 생성 상태를 조회한다.
  public Optional<Status> get(Long userId) {
    String raw = stringRedisTemplate.opsForValue().get(statusKey(userId));
    if (raw == null) {
      return Optional.empty();
    }

    String[] parts = raw.split("\\|", -1);
    if (parts.length < 3) {
      return Optional.empty();
    }

    Long nodeId = parts[1].isBlank() ? null : Long.parseLong(parts[1]);
    int count = parts[2].isBlank() ? 0 : Integer.parseInt(parts[2]);
    return Optional.of(Status.builder().status(parts[0]).nodeId(nodeId).count(count).build());
  }

  private void save(Long userId, String status, Long nodeId, int count, Duration ttl) {
    String value = status + "|" + (nodeId == null ? "" : nodeId) + "|" + count;
    stringRedisTemplate.opsForValue().set(statusKey(userId), value, ttl);
  }

  private String statusKey(Long userId) {
    return STATUS_PREFIX + userId;
  }

  // 추천 생성 상태 값이다.
  @Getter
  @Builder
  public static class Status {

    private final String status;
    private final Long nodeId;
    private final int count;
  }
}
package com.devpath.domain.learning.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PlaybackDeviceRegistry {

  private static final Duration SESSION_TTL = Duration.ofHours(12);

  private final Map<Long, Map<String, Instant>> activeDevicesByUser = new HashMap<>();

  public synchronized void register(Long userId, String deviceId, int maximumDevices) {
    if (userId == null || maximumDevices <= 0) {
      return;
    }

    String normalizedDeviceId = normalizeDeviceId(userId, deviceId);
    Instant now = Instant.now();
    Map<String, Instant> activeDevices =
        activeDevicesByUser.computeIfAbsent(userId, ignored -> new HashMap<>());
    removeExpired(activeDevices, now);

    if (!activeDevices.containsKey(normalizedDeviceId) && activeDevices.size() >= maximumDevices) {
      throw new CustomException(ErrorCode.PLAYBACK_DEVICE_LIMIT_EXCEEDED);
    }

    activeDevices.put(normalizedDeviceId, now.plus(SESSION_TTL));
  }

  private String normalizeDeviceId(Long userId, String deviceId) {
    if (deviceId == null || deviceId.isBlank()) {
      return "default-" + userId;
    }
    return deviceId.trim();
  }

  private void removeExpired(Map<String, Instant> activeDevices, Instant now) {
    Iterator<Map.Entry<String, Instant>> iterator = activeDevices.entrySet().iterator();
    while (iterator.hasNext()) {
      if (!iterator.next().getValue().isAfter(now)) {
        iterator.remove();
      }
    }
  }
}

package com.devpath.api.notification.service;

import com.devpath.api.notification.dto.NotificationResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class NotificationSseService {

  private static final long SSE_TIMEOUT_MILLIS = 60L * 60L * 1000L;
  private static final long RECONNECT_TIME_MILLIS = 3_000L;

  private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

  public SseEmitter subscribe(Long learnerId) {
    SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);

    SseEmitter oldEmitter = emitters.put(learnerId, emitter);
    completeOldEmitter(oldEmitter);

    emitter.onCompletion(() -> emitters.remove(learnerId, emitter));
    emitter.onTimeout(() -> emitters.remove(learnerId, emitter));
    emitter.onError(error -> emitters.remove(learnerId, emitter));

    sendConnectEvent(learnerId, emitter);

    return emitter;
  }

  public void send(Long learnerId, NotificationResponse response) {
    SseEmitter emitter = emitters.get(learnerId);

    if (emitter == null) {
      return;
    }

    try {
      emitter.send(
          SseEmitter.event()
              .name("notification")
              .reconnectTime(RECONNECT_TIME_MILLIS)
              .data(response));
    } catch (IOException exception) {
      emitters.remove(learnerId, emitter);
      emitter.completeWithError(exception);
    }
  }

  private void sendConnectEvent(Long learnerId, SseEmitter emitter) {
    try {
      emitter.send(
          SseEmitter.event()
              .name("connect")
              .reconnectTime(RECONNECT_TIME_MILLIS)
              .data("notification-sse-connected:" + learnerId));
    } catch (IOException exception) {
      emitters.remove(learnerId, emitter);
      emitter.completeWithError(exception);
    }
  }

  private void completeOldEmitter(SseEmitter oldEmitter) {
    if (oldEmitter == null) {
      return;
    }

    oldEmitter.complete();
  }
}

package com.devpath.api.qna.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class QnaRealtimeWebSocketHandler extends TextWebSocketHandler {

  private final ObjectMapper objectMapper;
  private final Map<Long, Map<String, ClientSession>> userSessions = new ConcurrentHashMap<>();

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    ClientSession client = getClientSession(session);

    if (client == null) {
      session.close(CloseStatus.POLICY_VIOLATION);
      return;
    }

    userSessions
        .computeIfAbsent(client.userId(), key -> new ConcurrentHashMap<>())
        .put(session.getId(), client);
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    removeClientSession(session);
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
    removeClientSession(session);
    session.close(CloseStatus.SERVER_ERROR);
  }

  public void publishAnswerChanged(
      Long userId, Long courseId, Long questionId, Long answerId, String type) {
    if (userId == null || courseId == null || questionId == null) {
      return;
    }

    Map<String, ClientSession> sessions = userSessions.get(userId);

    if (sessions == null || sessions.isEmpty()) {
      return;
    }

    ObjectNode message = objectMapper.createObjectNode();
    message.put("type", type);
    message.put("courseId", courseId);
    message.put("questionId", questionId);
    if (answerId != null) {
      message.put("answerId", answerId);
    }
    message.put("occurredAt", Instant.now().toString());

    sessions.values().stream()
        .filter(client -> courseId.equals(client.courseId()))
        .forEach(
            client -> {
              try {
                send(client.session(), message);
              } catch (IOException ignored) {
                // Closed sessions are removed by the WebSocket close/error callbacks.
              }
            });
  }

  private ClientSession getClientSession(WebSocketSession session) {
    Long courseId = getLongAttribute(session, QnaRealtimeHandshakeInterceptor.COURSE_ID_ATTRIBUTE);
    Long userId = getLongAttribute(session, QnaRealtimeHandshakeInterceptor.USER_ID_ATTRIBUTE);

    if (courseId == null || userId == null) {
      return null;
    }

    return new ClientSession(session, courseId, userId);
  }

  private void removeClientSession(WebSocketSession session) {
    Long userId = getLongAttribute(session, QnaRealtimeHandshakeInterceptor.USER_ID_ATTRIBUTE);

    if (userId == null) {
      return;
    }

    Map<String, ClientSession> sessions = userSessions.get(userId);

    if (sessions == null) {
      return;
    }

    sessions.remove(session.getId());

    if (sessions.isEmpty()) {
      userSessions.remove(userId);
    }
  }

  private Long getLongAttribute(WebSocketSession session, String name) {
    Object value = session.getAttributes().get(name);

    return value instanceof Long longValue ? longValue : null;
  }

  private void send(WebSocketSession session, ObjectNode message) throws IOException {
    if (!session.isOpen()) {
      return;
    }

    synchronized (session) {
      if (session.isOpen()) {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
      }
    }
  }

  private record ClientSession(WebSocketSession session, Long courseId, Long userId) {}
}

package com.devpath.api.voice.signaling;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

class VoiceSignalingWebSocketHandlerTest {

  private final VoiceSignalingWebSocketHandler handler =
      new VoiceSignalingWebSocketHandler(new ObjectMapper());

  @Test
  void leaveRemovesSessionAndBroadcastsPeerLeftOnce() throws Exception {
    WebSocketSession remainingSession = session("remaining", 6L, 10L, "remaining");
    WebSocketSession leavingSession = session("leaving", 6L, 20L, "leaving");

    handler.afterConnectionEstablished(remainingSession);
    handler.afterConnectionEstablished(leavingSession);
    clearInvocations(remainingSession, leavingSession);

    handler.handleTextMessage(leavingSession, new TextMessage("{\"type\":\"leave\"}"));
    handler.afterConnectionClosed(leavingSession, CloseStatus.NORMAL);

    verify(leavingSession).close(CloseStatus.NORMAL);
    verify(remainingSession, times(1))
        .sendMessage(
            argThat(
                message -> {
                  String payload = ((TextMessage) message).getPayload();
                  return payload.contains("\"type\":\"peer-left\"")
                      && payload.contains("\"fromUserId\":20");
                }));
  }

  @Test
  void reconnectReplacesPreviousSessionForSameUser() throws Exception {
    WebSocketSession previousSession = session("previous", 6L, 10L, "user");
    WebSocketSession currentSession = session("current", 6L, 10L, "user");
    WebSocketSession peerSession = session("peer", 6L, 20L, "peer");

    handler.afterConnectionEstablished(previousSession);
    clearInvocations(previousSession);

    handler.afterConnectionEstablished(currentSession);
    verify(previousSession).close(CloseStatus.NORMAL);
    clearInvocations(previousSession, currentSession);

    handler.afterConnectionEstablished(peerSession);

    verify(previousSession, never()).sendMessage(any());
    verify(currentSession, times(1))
        .sendMessage(
            argThat(
                message -> {
                  String payload = ((TextMessage) message).getPayload();
                  return payload.contains("\"type\":\"peer-joined\"")
                      && payload.contains("\"fromUserId\":20");
                }));
  }

  private WebSocketSession session(String sessionId, long channelId, long userId, String userName) {
    WebSocketSession session = mock(WebSocketSession.class);
    Map<String, Object> attributes = new HashMap<>();
    attributes.put(VoiceSignalingHandshakeInterceptor.CHANNEL_ID_ATTRIBUTE, channelId);
    attributes.put(VoiceSignalingHandshakeInterceptor.USER_ID_ATTRIBUTE, userId);
    attributes.put(VoiceSignalingHandshakeInterceptor.USER_NAME_ATTRIBUTE, userName);

    when(session.getId()).thenReturn(sessionId);
    when(session.getAttributes()).thenReturn(attributes);
    when(session.isOpen()).thenReturn(true);
    return session;
  }
}

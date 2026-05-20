package com.devpath.api.voice.signaling;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
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
public class VoiceSignalingWebSocketHandler extends TextWebSocketHandler {

  private static final String TYPE_PEER_LIST = "peer-list";
  private static final String TYPE_PEER_JOINED = "peer-joined";
  private static final String TYPE_PEER_LEFT = "peer-left";
  private static final String TYPE_OFFER = "offer";
  private static final String TYPE_ANSWER = "answer";
  private static final String TYPE_ICE_CANDIDATE = "ice-candidate";
  private static final String TYPE_REACTION = "reaction";
  private static final String TYPE_SPEAKING = "speaking";
  private static final String TYPE_STOP_SPEAKING = "stop-speaking";
  private static final String TYPE_SCREEN_SHARE_START = "screen-share-start";
  private static final String TYPE_SCREEN_SHARE_STOP = "screen-share-stop";
  private static final String TYPE_ERROR = "error";

  private final ObjectMapper objectMapper;
  private final Map<Long, Map<String, ClientSession>> channelSessions = new ConcurrentHashMap<>();

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    ClientSession client = getClientSession(session);

    if (client == null) {
      session.close(CloseStatus.POLICY_VIOLATION);
      return;
    }

    Map<String, ClientSession> clients =
        channelSessions.computeIfAbsent(client.channelId(), key -> new ConcurrentHashMap<>());
    List<VoiceSignalingPeer> peers =
        clients.values().stream()
            .filter(existing -> !existing.userId().equals(client.userId()))
            .map(existing -> new VoiceSignalingPeer(existing.userId(), existing.userName()))
            .toList();

    clients.put(session.getId(), client);
    sendPeerList(client.session(), client.channelId(), peers);
    broadcastPeerChange(client, TYPE_PEER_JOINED);
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    ClientSession client = getRegisteredClientSession(session);

    if (client == null) {
      session.close(CloseStatus.POLICY_VIOLATION);
      return;
    }

    JsonNode root = objectMapper.readTree(message.getPayload());
    String type = root.path("type").asText("");

    if (isTransientRoomEventType(type)) {
      broadcastTransientRoomEvent(client, type, root.path("payload"));
      return;
    }

    if (!isForwardedSignalType(type)) {
      sendError(session, "Unsupported voice signaling message.");
      return;
    }

    Long targetUserId = root.path("targetUserId").canConvertToLong()
        ? root.path("targetUserId").asLong()
        : null;

    if (targetUserId == null) {
      sendError(session, "Missing voice signaling target.");
      return;
    }

    ObjectNode outgoing = objectMapper.createObjectNode();
    outgoing.put("type", type);
    outgoing.put("channelId", client.channelId());
    outgoing.put("fromUserId", client.userId());
    outgoing.put("fromUserName", client.userName());
    outgoing.set("payload", root.path("payload"));

    sendToUser(client.channelId(), targetUserId, outgoing);
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    ClientSession client = removeClientSession(session);

    if (client != null) {
      broadcastPeerChange(client, TYPE_PEER_LEFT);
    }
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
    session.close(CloseStatus.SERVER_ERROR);
  }

  private ClientSession getClientSession(WebSocketSession session) {
    Long channelId =
        getLongAttribute(session, VoiceSignalingHandshakeInterceptor.CHANNEL_ID_ATTRIBUTE);
    Long userId = getLongAttribute(session, VoiceSignalingHandshakeInterceptor.USER_ID_ATTRIBUTE);
    String userName =
        (String) session.getAttributes().get(VoiceSignalingHandshakeInterceptor.USER_NAME_ATTRIBUTE);

    if (channelId == null || userId == null || userName == null) {
      return null;
    }

    return new ClientSession(session, channelId, userId, userName);
  }

  private ClientSession getRegisteredClientSession(WebSocketSession session) {
    Long channelId =
        getLongAttribute(session, VoiceSignalingHandshakeInterceptor.CHANNEL_ID_ATTRIBUTE);

    if (channelId == null) {
      return null;
    }

    Map<String, ClientSession> clients = channelSessions.get(channelId);

    return clients == null ? null : clients.get(session.getId());
  }

  private ClientSession removeClientSession(WebSocketSession session) {
    Long channelId =
        getLongAttribute(session, VoiceSignalingHandshakeInterceptor.CHANNEL_ID_ATTRIBUTE);

    if (channelId == null) {
      return null;
    }

    Map<String, ClientSession> clients = channelSessions.get(channelId);

    if (clients == null) {
      return null;
    }

    ClientSession client = clients.remove(session.getId());

    if (clients.isEmpty()) {
      channelSessions.remove(channelId);
    }

    return client;
  }

  private Long getLongAttribute(WebSocketSession session, String name) {
    Object value = session.getAttributes().get(name);

    return value instanceof Long longValue ? longValue : null;
  }

  private boolean isForwardedSignalType(String type) {
    return TYPE_OFFER.equals(type) || TYPE_ANSWER.equals(type) || TYPE_ICE_CANDIDATE.equals(type);
  }

  private boolean isTransientRoomEventType(String type) {
    return TYPE_REACTION.equals(type)
        || TYPE_SPEAKING.equals(type)
        || TYPE_STOP_SPEAKING.equals(type)
        || TYPE_SCREEN_SHARE_START.equals(type)
        || TYPE_SCREEN_SHARE_STOP.equals(type);
  }

  private void sendPeerList(
      WebSocketSession session, Long channelId, List<VoiceSignalingPeer> peers) throws IOException {
    ObjectNode message = objectMapper.createObjectNode();
    ArrayNode peerArray = message.putArray("peers");

    message.put("type", TYPE_PEER_LIST);
    message.put("channelId", channelId);

    for (VoiceSignalingPeer peer : peers) {
      ObjectNode peerNode = objectMapper.createObjectNode();
      peerNode.put("userId", peer.userId());
      peerNode.put("userName", peer.userName());
      peerArray.add(peerNode);
    }

    send(session, message);
  }

  private void broadcastPeerChange(ClientSession client, String type) {
    ObjectNode message = objectMapper.createObjectNode();
    message.put("type", type);
    message.put("channelId", client.channelId());
    message.put("fromUserId", client.userId());
    message.put("fromUserName", client.userName());
    broadcast(client.channelId(), client.session().getId(), message);
  }

  private void broadcastTransientRoomEvent(ClientSession client, String type, JsonNode payload) {
    ObjectNode message = objectMapper.createObjectNode();
    message.put("type", type);
    message.put("channelId", client.channelId());
    message.put("fromUserId", client.userId());
    message.put("fromUserName", client.userName());
    message.set("payload", payload);
    broadcast(client.channelId(), client.session().getId(), message);
  }

  private void sendToUser(Long channelId, Long targetUserId, ObjectNode message) throws IOException {
    Map<String, ClientSession> clients = channelSessions.get(channelId);

    if (clients == null) {
      return;
    }

    List<WebSocketSession> targets = new ArrayList<>();

    for (ClientSession client : clients.values()) {
      if (targetUserId.equals(client.userId())) {
        targets.add(client.session());
      }
    }

    for (WebSocketSession target : targets) {
      send(target, message);
    }
  }

  private void broadcast(Long channelId, String excludedSessionId, ObjectNode message) {
    Map<String, ClientSession> clients = channelSessions.get(channelId);

    if (clients == null) {
      return;
    }

    for (ClientSession client : clients.values()) {
      if (!client.session().getId().equals(excludedSessionId)) {
        try {
          send(client.session(), message);
        } catch (IOException ignored) {
          // Stale sessions are cleaned up by the WebSocket close/error callbacks.
        }
      }
    }
  }

  private void sendError(WebSocketSession session, String detail) throws IOException {
    ObjectNode message = objectMapper.createObjectNode();
    message.put("type", TYPE_ERROR);
    message.put("detail", detail);
    send(session, message);
  }

  private void send(WebSocketSession session, JsonNode message) throws IOException {
    if (!session.isOpen()) {
      return;
    }

    synchronized (session) {
      if (session.isOpen()) {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
      }
    }
  }

  private record ClientSession(
      WebSocketSession session, Long channelId, Long userId, String userName) {}
}

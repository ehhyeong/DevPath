package com.devpath.api.voice.signaling;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class VoiceSignalingHandshakeInterceptor implements HandshakeInterceptor {

  public static final String CHANNEL_ID_ATTRIBUTE = "voiceChannelId";
  public static final String USER_ID_ATTRIBUTE = "voiceUserId";
  public static final String USER_NAME_ATTRIBUTE = "voiceUserName";

  private final VoiceSignalingAuthService authService;

  @Override
  public boolean beforeHandshake(
      ServerHttpRequest request,
      ServerHttpResponse response,
      WebSocketHandler wsHandler,
      Map<String, Object> attributes) {
    try {
      Map<String, List<String>> params =
          UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
      Long channelId = parseLong(getFirst(params, "channelId"));
      String token = getFirst(params, "token");
      VoiceSignalingUser user = authService.authenticate(channelId, token);

      attributes.put(CHANNEL_ID_ATTRIBUTE, user.channelId());
      attributes.put(USER_ID_ATTRIBUTE, user.userId());
      attributes.put(USER_NAME_ATTRIBUTE, user.userName());
      return true;
    } catch (RuntimeException ex) {
      if (response instanceof ServletServerHttpResponse servletResponse) {
        servletResponse.getServletResponse().setStatus(HttpStatus.UNAUTHORIZED.value());
      }
      return false;
    }
  }

  @Override
  public void afterHandshake(
      ServerHttpRequest request,
      ServerHttpResponse response,
      WebSocketHandler wsHandler,
      Exception exception) {}

  private String getFirst(Map<String, List<String>> params, String name) {
    List<String> values = params.get(name);

    return values == null || values.isEmpty() ? null : values.get(0);
  }

  private Long parseLong(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    try {
      return Long.parseLong(value);
    } catch (NumberFormatException ex) {
      return null;
    }
  }
}

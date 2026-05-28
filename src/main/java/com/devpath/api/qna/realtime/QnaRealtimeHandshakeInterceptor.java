package com.devpath.api.qna.realtime;

import com.devpath.common.exception.ErrorCode;
import com.devpath.common.security.JwtAuthenticationException;
import com.devpath.common.security.JwtTokenProvider;
import com.devpath.common.security.TokenRedisService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class QnaRealtimeHandshakeInterceptor implements HandshakeInterceptor {

  public static final String COURSE_ID_ATTRIBUTE = "qnaCourseId";
  public static final String USER_ID_ATTRIBUTE = "qnaUserId";

  private final JwtTokenProvider jwtTokenProvider;
  private final TokenRedisService tokenRedisService;

  @Override
  public boolean beforeHandshake(
      ServerHttpRequest request,
      ServerHttpResponse response,
      WebSocketHandler wsHandler,
      Map<String, Object> attributes) {
    try {
      Map<String, List<String>> params =
          UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
      Long courseId = parseLong(getFirst(params, "courseId"));
      String token = getFirst(params, "token");

      if (courseId == null || !StringUtils.hasText(token)) {
        throw new JwtAuthenticationException(ErrorCode.JWT_EMPTY);
      }

      JwtTokenProvider.TokenClaims claims = jwtTokenProvider.parseAccessToken(token);

      if (tokenRedisService.isAccessJtiBlacklisted(claims.jti())) {
        throw new JwtAuthenticationException(ErrorCode.JWT_BLACKLISTED);
      }

      attributes.put(COURSE_ID_ATTRIBUTE, courseId);
      attributes.put(USER_ID_ATTRIBUTE, claims.userId());
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

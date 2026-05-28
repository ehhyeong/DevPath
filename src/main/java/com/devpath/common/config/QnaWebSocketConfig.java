package com.devpath.common.config;

import com.devpath.api.qna.realtime.QnaRealtimeHandshakeInterceptor;
import com.devpath.api.qna.realtime.QnaRealtimeWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@RequiredArgsConstructor
public class QnaWebSocketConfig implements WebSocketConfigurer {

  private final QnaRealtimeWebSocketHandler qnaRealtimeWebSocketHandler;
  private final QnaRealtimeHandshakeInterceptor qnaRealtimeHandshakeInterceptor;

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry
        .addHandler(qnaRealtimeWebSocketHandler, "/ws/qna")
        .addInterceptors(qnaRealtimeHandshakeInterceptor)
        .setAllowedOriginPatterns("*");
  }
}

package com.devpath.common.config;

import com.devpath.api.voice.signaling.VoiceSignalingHandshakeInterceptor;
import com.devpath.api.voice.signaling.VoiceSignalingWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class VoiceWebSocketConfig implements WebSocketConfigurer {

  private final VoiceSignalingWebSocketHandler voiceSignalingWebSocketHandler;
  private final VoiceSignalingHandshakeInterceptor voiceSignalingHandshakeInterceptor;

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry
        .addHandler(voiceSignalingWebSocketHandler, "/ws/voice-signaling")
        .addInterceptors(voiceSignalingHandshakeInterceptor)
        .setAllowedOriginPatterns("*");
  }
}

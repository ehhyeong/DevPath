package com.devpath.common.config;

import com.devpath.api.voice.signaling.VoiceSignalingHandshakeInterceptor;
import com.devpath.api.voice.signaling.VoiceSignalingWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class VoiceWebSocketConfig implements WebSocketConfigurer {

  private static final int VOICE_SIGNALING_MESSAGE_BUFFER_SIZE = 64 * 1024;

  private final VoiceSignalingWebSocketHandler voiceSignalingWebSocketHandler;
  private final VoiceSignalingHandshakeInterceptor voiceSignalingHandshakeInterceptor;

  @Bean
  @Profile("!test")
  public ServletServerContainerFactoryBean voiceWebSocketContainer() {
    ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
    container.setMaxTextMessageBufferSize(VOICE_SIGNALING_MESSAGE_BUFFER_SIZE);
    container.setMaxBinaryMessageBufferSize(VOICE_SIGNALING_MESSAGE_BUFFER_SIZE);
    return container;
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry
        .addHandler(voiceSignalingWebSocketHandler, "/ws/voice-signaling")
        .addInterceptors(voiceSignalingHandshakeInterceptor)
        .setAllowedOriginPatterns("*");
  }
}

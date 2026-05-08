package com.devpath.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "gemini.api")
@Getter
@Setter
public class GeminiProperties {
  private String key;
}

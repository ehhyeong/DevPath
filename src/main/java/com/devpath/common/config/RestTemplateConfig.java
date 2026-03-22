package com.devpath.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    // 외부 HTTP 통신(OCR 서버, Gemini AI 등)에 사용하는 RestTemplate Bean을 등록한다.
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}

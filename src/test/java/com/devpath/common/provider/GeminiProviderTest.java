package com.devpath.common.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.common.config.GeminiProperties;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

class GeminiProviderTest {

  @Test
  void retriesSameModelAfterQuotaResponse() {
    RestTemplate restTemplate = mock(RestTemplate.class);
    RestClientResponseException quotaError = quotaError();
    when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
        .thenThrow(quotaError)
        .thenReturn(successResponse());
    GeminiProvider provider = new GeminiProvider(properties(), restTemplate);

    String result = provider.generateJsonOrThrowOnQuota("prompt", Map.of("type", "object"), 100);

    assertThat(result).isEqualTo("generated");
    verify(restTemplate, times(2))
        .postForObject(anyString(), any(HttpEntity.class), eq(String.class));
  }

  @Test
  void throwsQuotaExceptionAfterRetriesAreExhausted() {
    RestTemplate restTemplate = mock(RestTemplate.class);
    RestClientResponseException quotaError = quotaError();
    when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
        .thenThrow(quotaError);
    GeminiProvider provider = new GeminiProvider(properties(), restTemplate);

    assertThatThrownBy(
            () -> provider.generateJsonOrThrowOnQuota("prompt", Map.of("type", "object"), 100))
        .isInstanceOf(GeminiQuotaExceededException.class)
        .hasMessage("Gemini 요청 한도가 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    verify(restTemplate, times(2))
        .postForObject(anyString(), any(HttpEntity.class), eq(String.class));
  }

  private GeminiProperties properties() {
    GeminiProperties properties = new GeminiProperties();
    properties.setKey("test-key");
    properties.setModel("gemini-test");
    properties.setFallbackModels("");
    return properties;
  }

  private RestClientResponseException quotaError() {
    RestClientResponseException exception = mock(RestClientResponseException.class);
    HttpHeaders headers = new HttpHeaders();
    headers.set("Retry-After", "0");
    when(exception.getStatusCode()).thenReturn(HttpStatus.TOO_MANY_REQUESTS);
    when(exception.getResponseHeaders()).thenReturn(headers);
    when(exception.getResponseBodyAsString())
        .thenReturn("{\"error\":{\"code\":429,\"message\":\"Quota exceeded\"}}");
    return exception;
  }

  private String successResponse() {
    return "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"generated\"}]}}]}";
  }
}

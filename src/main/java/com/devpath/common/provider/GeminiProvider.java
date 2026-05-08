package com.devpath.common.provider;

import com.devpath.common.config.GeminiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiProvider {

  private static final String GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=";

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final GeminiProperties geminiProperties;
  private final RestTemplate restTemplate;

  /** Gemini API를 호출하여 텍스트 응답을 반환한다. 실패 시 null을 반환하며, 호출부에서 fallback 처리한다. */
  public String generate(String prompt) {
    try {
      String url = GEMINI_URL + geminiProperties.getKey();

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);

      Map<String, Object> body =
          Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

      HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
      String raw = restTemplate.postForObject(url, request, String.class);

      JsonNode root = MAPPER.readTree(raw);
      return root.path("candidates")
          .get(0)
          .path("content")
          .path("parts")
          .get(0)
          .path("text")
          .asText(null);

    } catch (Exception e) {
      log.warn("[GeminiProvider] API 호출 실패: {}", e.getMessage());
      return null;
    }
  }
}

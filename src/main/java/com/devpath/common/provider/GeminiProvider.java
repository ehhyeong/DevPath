package com.devpath.common.provider;

import com.devpath.common.config.GeminiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiProvider {

  private static final String GEMINI_URL_FORMAT =
      "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
  private static final int MAX_ATTEMPTS_PER_MODEL = 1;
  private static final Set<Integer> RETRYABLE_STATUS_CODES = Set.of(429, 500, 502, 503, 504);
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final GeminiProperties geminiProperties;
  private final RestTemplate restTemplate;

  public String generate(String prompt) {
    return generate(prompt, null, null);
  }

  public String generate(String prompt, String inlineMimeType, String inlineBase64Data) {
    List<Object> parts = new ArrayList<>();
    parts.add(Map.of("text", prompt));

    if (!normalize(inlineMimeType).isBlank() && !normalize(inlineBase64Data).isBlank()) {
      parts.add(
          Map.of(
              "inline_data",
              Map.of("mime_type", normalize(inlineMimeType), "data", normalize(inlineBase64Data))));
    }

    Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", parts)));
    return execute(body);
  }

  /**
   * 순수 텍스트 분석(채용공고 채점 등) 전용. thinking 모델의 추론 단계를 끄고 JSON 응답을 강제해 응답 지연과 출력 잘림을 방지한다.
   */
  public String generateJson(String prompt) {
    return generateJson(prompt, null, null, 4096);
  }

  /**
   * thinking 비활성화 + JSON 강제 경로에 멀티모달(영상/이미지) 입력과 출력 토큰 한도를 함께 지정할 수 있는 변형. 퀴즈 생성처럼 응답이 길고
   * inline_data가 필요한 경우에 사용해 추론 지연을 줄인다.
   */
  public String generateJson(
      String prompt, String inlineMimeType, String inlineBase64Data, int maxOutputTokens) {
    List<Object> parts = new ArrayList<>();
    parts.add(Map.of("text", prompt));

    if (!normalize(inlineMimeType).isBlank() && !normalize(inlineBase64Data).isBlank()) {
      parts.add(
          Map.of(
              "inline_data",
              Map.of("mime_type", normalize(inlineMimeType), "data", normalize(inlineBase64Data))));
    }

    Map<String, Object> generationConfig =
        Map.of(
            "responseMimeType", "application/json",
            "thinkingConfig", Map.of("thinkingBudget", 0),
            "maxOutputTokens", maxOutputTokens);

    Map<String, Object> body =
        Map.of(
            "contents", List.of(Map.of("parts", parts)),
            "generationConfig", generationConfig);
    return execute(body);
  }

  private String execute(Map<String, Object> body) {
    String apiKey = normalize(geminiProperties.getKey());

    if (apiKey.isBlank()) {
      log.warn("[GeminiProvider] API key is not configured.");
      return null;
    }

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
    List<String> models = resolveModels();

    for (String model : models) {
      String url = GEMINI_URL_FORMAT.formatted(model, apiKey);

      for (int attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
        try {
          String raw = restTemplate.postForObject(url, request, String.class);
          String text = extractText(raw);

          if (!normalize(text).isBlank()) {
            return text;
          }

          log.warn("[GeminiProvider] model={} returned an empty response.", model);
          break;
        } catch (RestClientResponseException e) {
          int status = e.getStatusCode().value();
          log.warn(
              "[GeminiProvider] model={} attempt={}/{} failed with status {}: {}",
              model,
              attempt,
              MAX_ATTEMPTS_PER_MODEL,
              status,
              shorten(e.getResponseBodyAsString(), 180));

          if (status == 401 || status == 403) {
            return null;
          }

          if (!RETRYABLE_STATUS_CODES.contains(status) || attempt == MAX_ATTEMPTS_PER_MODEL) {
            break;
          }

          pauseBeforeRetry();
        } catch (Exception e) {
          log.warn(
              "[GeminiProvider] model={} attempt={}/{} failed: {}",
              model,
              attempt,
              MAX_ATTEMPTS_PER_MODEL,
              e.getMessage());

          if (attempt == MAX_ATTEMPTS_PER_MODEL) {
            break;
          }

          pauseBeforeRetry();
        }
      }
    }

    log.warn("[GeminiProvider] all configured models failed: {}", String.join(", ", models));
    return null;
  }

  private String extractText(String raw) throws Exception {
    JsonNode root = MAPPER.readTree(raw);

    return root.path("candidates")
        .path(0)
        .path("content")
        .path("parts")
        .path(0)
        .path("text")
        .asText(null);
  }

  private List<String> resolveModels() {
    LinkedHashSet<String> models = new LinkedHashSet<>();
    addModel(models, geminiProperties.getModel());

    for (String model : normalize(geminiProperties.getFallbackModels()).split(",")) {
      addModel(models, model);
    }

    if (models.isEmpty()) {
      models.add("gemini-3-flash-preview");
    }

    return new ArrayList<>(models);
  }

  private void addModel(LinkedHashSet<String> models, String model) {
    String normalized = normalize(model);

    if (normalized.startsWith("models/")) {
      normalized = normalized.substring("models/".length());
    }

    if (!normalized.isBlank()) {
      models.add(normalized);
    }
  }

  private void pauseBeforeRetry() {
    try {
      Thread.sleep(300);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim();
  }

  private String shorten(String value, int maxLength) {
    String normalized = normalize(value).replaceAll("\\s+", " ");

    if (normalized.length() <= maxLength) {
      return normalized;
    }

    return normalized.substring(0, maxLength) + "...";
  }
}

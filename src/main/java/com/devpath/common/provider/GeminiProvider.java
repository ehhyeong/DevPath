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
  private static final int QUOTA_AWARE_MAX_ATTEMPTS_PER_MODEL = 2;
  private static final long DEFAULT_RETRY_DELAY_MILLIS = 5_000;
  private static final long MAX_RETRY_DELAY_MILLIS = 60_000;
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

  /** 순수 텍스트 분석(채용공고 채점 등) 전용. thinking 모델의 추론 단계를 끄고 JSON 응답을 강제해 응답 지연과 출력 잘림을 방지한다. */
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
            "responseMimeType",
            "application/json",
            "thinkingConfig",
            Map.of("thinkingBudget", 0),
            "maxOutputTokens",
            maxOutputTokens);

    Map<String, Object> body =
        Map.of("contents", List.of(Map.of("parts", parts)), "generationConfig", generationConfig);
    return execute(body);
  }

  /**
   * responseSchema로 출력 구조를 강제하는 JSON 생성. 여러 종류의 결과를 한 번의 호출로 받아 호출 횟수와 응답 편차를 줄일 때 사용한다. thinking은
   * 비활성화한다.
   */
  public String generateJson(
      String prompt, Map<String, Object> responseSchema, int maxOutputTokens) {
    return generateJson(prompt, responseSchema, maxOutputTokens, false);
  }

  public String generateJsonOrThrowOnQuota(
      String prompt, Map<String, Object> responseSchema, int maxOutputTokens) {
    return generateJson(prompt, responseSchema, maxOutputTokens, true);
  }

  private String generateJson(
      String prompt,
      Map<String, Object> responseSchema,
      int maxOutputTokens,
      boolean throwOnQuota) {
    Map<String, Object> generationConfig = new java.util.HashMap<>();
    generationConfig.put("responseMimeType", "application/json");
    generationConfig.put("thinkingConfig", Map.of("thinkingBudget", 0));
    generationConfig.put("maxOutputTokens", maxOutputTokens);
    if (responseSchema != null) {
      generationConfig.put("responseSchema", responseSchema);
    }

    Map<String, Object> body =
        Map.of(
            "contents",
            List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
            "generationConfig",
            generationConfig);
    return execute(body, throwOnQuota);
  }

  private String execute(Map<String, Object> body) {
    return execute(body, false);
  }

  private String execute(Map<String, Object> body, boolean throwOnQuota) {
    String apiKey = normalize(geminiProperties.getKey());

    if (apiKey.isBlank()) {
      log.warn("[GeminiProvider] API key is not configured.");
      return null;
    }

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
    List<String> models = resolveModels();
    boolean quotaExceeded = false;
    int maxAttemptsPerModel = throwOnQuota ? QUOTA_AWARE_MAX_ATTEMPTS_PER_MODEL : 1;

    for (String model : models) {
      String url = GEMINI_URL_FORMAT.formatted(model, apiKey);

      for (int attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
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
              maxAttemptsPerModel,
              status,
              shorten(e.getResponseBodyAsString(), 180));

          if (status == 401 || status == 403) {
            return null;
          }

          if (status == 429) {
            quotaExceeded = true;
          }

          if (!RETRYABLE_STATUS_CODES.contains(status) || attempt == maxAttemptsPerModel) {
            break;
          }

          pauseBeforeRetry(e, attempt);
        } catch (Exception e) {
          log.warn(
              "[GeminiProvider] model={} attempt={}/{} failed: {}",
              model,
              attempt,
              maxAttemptsPerModel,
              e.getMessage());

          if (attempt == maxAttemptsPerModel) {
            break;
          }

          pauseBeforeRetry(null, attempt);
        }
      }
    }

    log.warn("[GeminiProvider] all configured models failed: {}", String.join(", ", models));
    if (throwOnQuota && quotaExceeded) {
      throw new GeminiQuotaExceededException();
    }
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

  private void pauseBeforeRetry(RestClientResponseException exception, int attempt) {
    try {
      Thread.sleep(resolveRetryDelayMillis(exception, attempt));
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private long resolveRetryDelayMillis(RestClientResponseException exception, int attempt) {
    if (exception != null && exception.getResponseHeaders() != null) {
      Long headerDelay = parseDelaySeconds(exception.getResponseHeaders().getFirst("Retry-After"));
      if (headerDelay != null) {
        return headerDelay;
      }

      Long bodyDelay = parseRetryDelayFromBody(exception.getResponseBodyAsString());
      if (bodyDelay != null) {
        return bodyDelay;
      }
    }

    return Math.min(DEFAULT_RETRY_DELAY_MILLIS * attempt, MAX_RETRY_DELAY_MILLIS);
  }

  private Long parseRetryDelayFromBody(String responseBody) {
    try {
      JsonNode details = MAPPER.readTree(responseBody).path("error").path("details");
      if (details.isArray()) {
        for (JsonNode detail : details) {
          Long delay = parseDelaySeconds(detail.path("retryDelay").asText(null));
          if (delay != null) {
            return delay;
          }
        }
      }
    } catch (Exception ignored) {
      // 재시도 시간이 없는 오류 본문은 기본 지수 백오프로 처리한다.
    }
    return null;
  }

  private Long parseDelaySeconds(String value) {
    String normalized = normalize(value);
    if (normalized.endsWith("s")) {
      normalized = normalized.substring(0, normalized.length() - 1);
    }
    try {
      double seconds = Double.parseDouble(normalized);
      long millis = Math.max(0L, Math.round(seconds * 1_000));
      return Math.min(millis, MAX_RETRY_DELAY_MILLIS);
    } catch (NumberFormatException ignored) {
      return null;
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

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
  private static final int MAX_ATTEMPTS_PER_MODEL = 2;
  private static final Set<Integer> RETRYABLE_STATUS_CODES = Set.of(429, 500, 502, 503, 504);
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final GeminiProperties geminiProperties;
  private final RestTemplate restTemplate;

  public String generate(String prompt) {
    return generate(prompt, null, null);
  }

  public String generate(String prompt, String inlineMimeType, String inlineBase64Data) {
    String apiKey = normalize(geminiProperties.getKey());

    if (apiKey.isBlank()) {
      log.warn("[GeminiProvider] API key is not configured.");
      return null;
    }

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    List<Object> parts = new ArrayList<>();
    parts.add(Map.of("text", prompt));

    if (!normalize(inlineMimeType).isBlank() && !normalize(inlineBase64Data).isBlank()) {
      parts.add(
          Map.of(
              "inline_data",
              Map.of("mime_type", normalize(inlineMimeType), "data", normalize(inlineBase64Data))));
    }

    Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", parts)));
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

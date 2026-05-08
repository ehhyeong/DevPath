package com.devpath.common.provider;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Claude Vision API를 이용한 OCR 프로바이더.
 *
 * <p>ANTHROPIC_API_KEY 환경변수가 설정되어 있으면 활성화됩니다. 코드 이미지에서 거의 100%에 가까운 인식률을 제공합니다.
 *
 * <p>우선순위: Claude Vision → Python OCR 서버 → Tesseract.js(프론트엔드)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ClaudeOcrProvider {

  private static final String ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
  private static final String ANTHROPIC_VERSION = "2023-06-01";
  private static final String MODEL = "claude-haiku-4-5-20251001";
  private static final int MAX_TOKENS = 4096;

  private static final String OCR_PROMPT =
      "이 이미지에서 코드를 정확하게 추출해줘.\n"
          + "규칙:\n"
          + "- 줄 번호가 있으면 제거해\n"
          + "- 들여쓰기(공백/탭)는 그대로 유지해\n"
          + "- 코드 내용만 반환해, 설명·마크다운 코드블록 없이\n"
          + "- 코드가 보이지 않으면 빈 문자열을 반환해";

  private final RestTemplate restTemplate;

  @Value("${anthropic.api-key:}")
  private String apiKey;

  /** API key가 설정되어 있으면 true */
  public boolean isAvailable() {
    return apiKey != null && !apiKey.isBlank();
  }

  /**
   * base64 이미지를 Claude Vision으로 OCR합니다.
   *
   * @param base64Image data: 프리픽스 없는 PNG base64
   * @return 추출된 코드 텍스트 (실패 시 Optional.empty())
   */
  @SuppressWarnings("unchecked")
  public Optional<String> extractText(String base64Image) {
    if (!isAvailable()) return Optional.empty();

    try {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      headers.set("x-api-key", apiKey);
      headers.set("anthropic-version", ANTHROPIC_VERSION);

      Map<String, Object> imageContent =
          Map.of(
              "type",
              "image",
              "source",
              Map.of(
                  "type", "base64",
                  "media_type", "image/png",
                  "data", base64Image));
      Map<String, Object> textContent = Map.of("type", "text", "text", OCR_PROMPT);

      Map<String, Object> body =
          Map.of(
              "model", MODEL,
              "max_tokens", MAX_TOKENS,
              "messages",
                  List.of(Map.of("role", "user", "content", List.of(imageContent, textContent))));

      HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
      ResponseEntity<Map> response =
          restTemplate.exchange(ANTHROPIC_API_URL, HttpMethod.POST, request, Map.class);

      if (response.getBody() == null) return Optional.empty();

      List<Map<String, Object>> content =
          (List<Map<String, Object>>) response.getBody().get("content");
      if (content == null || content.isEmpty()) return Optional.empty();

      String text = (String) content.get(0).get("text");
      return Optional.ofNullable(text).filter(t -> !t.isBlank());

    } catch (RestClientException e) {
      log.warn("Claude Vision OCR 호출 실패, 하위 폴백 사용: {}", e.getMessage());
      return Optional.empty();
    }
  }
}

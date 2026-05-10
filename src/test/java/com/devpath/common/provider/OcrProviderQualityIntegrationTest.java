package com.devpath.common.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Tag("ocr")
class OcrProviderQualityIntegrationTest {

  private static final String DEFAULT_OCR_SERVER_URL = "http://localhost:5000";
  private static final List<String> EXPECTED_KEYWORDS =
      List.of("SPRING", "TOKEN", "ACCESS", "LOGIN", "REFRESH", "AUTH");

  private OcrProvider ocrProvider;

  @BeforeEach
  void setUp() {
    RestTemplate restTemplate = new RestTemplate(requestFactory());
    String ocrServerUrl = ocrServerUrl();

    assumeTrue(
        isOcrServerAvailable(restTemplate, ocrServerUrl), "Python OCR server is not running");

    ocrProvider = new OcrProvider(restTemplate);
    ReflectionTestUtils.setField(ocrProvider, "ocrServerUrl", ocrServerUrl);
  }

  @Test
  void extractTextWithPreprocessing_recognizesLectureSlideFixture() throws IOException {
    String base64Image = createLectureSlideBase64();

    OcrProvider.OcrResult rawResult = ocrProvider.extractText(base64Image);
    OcrProvider.OcrResult preprocessedResult =
        ocrProvider.extractTextWithPreprocessing(base64Image);

    int rawKeywordMatches = countExpectedKeywordMatches(rawResult);
    int preprocessedKeywordMatches = countExpectedKeywordMatches(preprocessedResult);

    assertThat(extractedText(preprocessedResult)).isNotBlank();
    assertThat(preprocessedKeywordMatches).isGreaterThanOrEqualTo(rawKeywordMatches);
    assertThat(preprocessedKeywordMatches).isGreaterThanOrEqualTo(2);
    assertThat(normalizedConfidence(preprocessedResult.getConfidence()))
        .isGreaterThanOrEqualTo(0.2D);
  }

  private SimpleClientHttpRequestFactory requestFactory() {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(Duration.ofSeconds(1));
    requestFactory.setReadTimeout(Duration.ofSeconds(30));
    return requestFactory;
  }

  private String ocrServerUrl() {
    String systemPropertyValue = System.getProperty("ocr.server.url");
    if (systemPropertyValue != null && !systemPropertyValue.isBlank()) {
      return systemPropertyValue;
    }

    String environmentValue = System.getenv("OCR_SERVER_URL");
    if (environmentValue != null && !environmentValue.isBlank()) {
      return environmentValue;
    }

    return DEFAULT_OCR_SERVER_URL;
  }

  private boolean isOcrServerAvailable(RestTemplate restTemplate, String ocrServerUrl) {
    try {
      ResponseEntity<String> response =
          restTemplate.getForEntity(ocrServerUrl + "/health", String.class);
      return response.getStatusCode().is2xxSuccessful();
    } catch (RestClientException e) {
      return false;
    }
  }

  private String createLectureSlideBase64() throws IOException {
    BufferedImage image = new BufferedImage(900, 360, BufferedImage.TYPE_INT_RGB);
    Graphics2D graphics = image.createGraphics();
    try {
      graphics.setColor(Color.WHITE);
      graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
      graphics.setRenderingHint(
          RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
      graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

      graphics.setColor(Color.BLACK);
      graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 52));
      graphics.drawString("SPRING TOKEN", 80, 110);

      graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 44));
      graphics.drawString("ACCESS LOGIN FLOW", 80, 190);
      graphics.drawString("REFRESH AUTH STATE", 80, 270);
    } finally {
      graphics.dispose();
    }

    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    ImageIO.write(image, "png", outputStream);
    return Base64.getEncoder().encodeToString(outputStream.toByteArray());
  }

  private int countExpectedKeywordMatches(OcrProvider.OcrResult result) {
    String normalizedText = normalizeForKeywordMatch(extractedText(result));
    return (int) EXPECTED_KEYWORDS.stream().filter(normalizedText::contains).count();
  }

  private String normalizeForKeywordMatch(String value) {
    return value == null
        ? ""
        : value.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", " ");
  }

  private String extractedText(OcrProvider.OcrResult result) {
    if (result == null || result.getText() == null) {
      return "";
    }
    return result.getText().trim();
  }

  private double normalizedConfidence(Double confidence) {
    if (confidence == null || confidence < 0.0D) {
      return 0.0D;
    }
    if (confidence > 1.0D) {
      return Math.min(confidence / 100.0D, 1.0D);
    }
    return confidence;
  }
}

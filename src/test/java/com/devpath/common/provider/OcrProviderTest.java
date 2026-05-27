package com.devpath.common.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"unchecked", "rawtypes"})
class OcrProviderTest {

  @Mock private RestTemplate restTemplate;

  private OcrProvider ocrProvider;

  @BeforeEach
  void setUp() {
    ocrProvider = new OcrProvider(restTemplate);
    ReflectionTestUtils.setField(ocrProvider, "ocrServerUrl", "http://ocr-test");
  }

  @Test
  void extractTextWithPreprocessing_stripsDataUrlPrefixAndWhitespace() throws IOException {
    String base64Image = createSampleImageBase64();
    OcrProvider.OcrResult providerResult =
        ocrResult("Spring Security", 0.95D, List.of("Spring Security"));

    when(restTemplate.exchange(
            eq("http://ocr-test/ocr"),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(OcrProvider.OcrResult.class)))
        .thenReturn(ResponseEntity.ok(providerResult));

    OcrProvider.OcrResult result =
        ocrProvider.extractTextWithPreprocessing(
            "data:image/png;base64,\n"
                + base64Image.substring(0, 12)
                + " \r\n "
                + base64Image.substring(12));

    assertThat(result.getText()).isEqualTo("Spring Security");

    ArgumentCaptor<HttpEntity> requestCaptor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(restTemplate)
        .exchange(
            eq("http://ocr-test/ocr"),
            eq(HttpMethod.POST),
            requestCaptor.capture(),
            eq(OcrProvider.OcrResult.class));

    Map<String, String> requestBody = (Map<String, String>) requestCaptor.getValue().getBody();
    assertThat(requestBody).containsEntry("image", base64Image);
  }

  @Test
  void extractTextWithPreprocessing_returnsBestResultFromPreprocessedAttempts() throws IOException {
    OcrProvider.OcrResult lowConfidenceResult = ocrResult("Spr", 0.31D, List.of("Spr"));
    OcrProvider.OcrResult highConfidenceResult =
        ocrResult("Spring Security OAuth", 92.0D, List.of("Spring Security", "OAuth"));

    when(restTemplate.exchange(
            eq("http://ocr-test/ocr"),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(OcrProvider.OcrResult.class)))
        .thenReturn(
            ResponseEntity.ok(lowConfidenceResult), ResponseEntity.ok(highConfidenceResult));

    OcrProvider.OcrResult result =
        ocrProvider.extractTextWithPreprocessing(createSampleImageBase64());

    assertThat(result.getText()).isEqualTo("Spring Security OAuth");
    assertThat(result.getConfidence()).isEqualTo(92.0D);
    verify(restTemplate, times(2))
        .exchange(
            eq("http://ocr-test/ocr"),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(OcrProvider.OcrResult.class));
  }

  @Test
  void extractTextWithPreprocessing_rethrowsWhenEveryAttemptFails() {
    when(restTemplate.exchange(
            eq("http://ocr-test/ocr"),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(OcrProvider.OcrResult.class)))
        .thenThrow(new ResourceAccessException("connection refused"));

    assertThatThrownBy(() -> ocrProvider.extractTextWithPreprocessing("not-base64"))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR);
  }

  private String createSampleImageBase64() throws IOException {
    BufferedImage image = new BufferedImage(28, 18, BufferedImage.TYPE_INT_RGB);
    Graphics2D graphics = image.createGraphics();
    try {
      graphics.setColor(Color.WHITE);
      graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
      graphics.setColor(Color.BLUE);
      graphics.fillRect(2, 2, 12, 8);
      graphics.setColor(Color.BLACK);
      graphics.drawLine(1, 15, 25, 3);
    } finally {
      graphics.dispose();
    }

    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    ImageIO.write(image, "png", outputStream);
    return Base64.getEncoder().encodeToString(outputStream.toByteArray());
  }

  private OcrProvider.OcrResult ocrResult(String text, Double confidence, List<String> lines) {
    OcrProvider.OcrResult result = new OcrProvider.OcrResult();
    ReflectionTestUtils.setField(result, "text", text);
    ReflectionTestUtils.setField(result, "confidence", confidence);
    ReflectionTestUtils.setField(result, "lines", lines);
    return result;
  }
}

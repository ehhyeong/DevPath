package com.devpath.common.provider;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.imageio.ImageIO;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class OcrProvider {

  private static final double GOOD_ENOUGH_CONFIDENCE = 0.88D;
  private static final int GOOD_ENOUGH_TEXT_LENGTH = 8;
  private static final int MAX_SCALE_WIDTH = 2400;
  private static final int MAX_SCALE_HEIGHT = 2400;

  private final RestTemplate restTemplate;

  @Value("${ocr.server.url:http://localhost:5000}")
  private String ocrServerUrl;

  public OcrResult extractTextFromImageUrl(String sourceImageUrl) {
    byte[] imageBytes = downloadImage(sourceImageUrl);
    String base64Image = Base64.getEncoder().encodeToString(imageBytes);
    return extractTextWithPreprocessing(base64Image);
  }

  public OcrResult extractTextWithPreprocessing(String base64Image) {
    RuntimeException lastException = null;
    OcrResult bestResult = OcrResult.empty();

    for (String candidate : buildPreprocessedCandidates(base64Image)) {
      try {
        OcrResult result = extractText(candidate);
        if (isBetterResult(result, bestResult)) {
          bestResult = result;
        }
        if (isGoodEnough(bestResult)) {
          break;
        }
      } catch (RuntimeException e) {
        lastException = e;
      }
    }

    if (hasText(bestResult)) {
      return bestResult;
    }
    if (lastException != null) {
      throw lastException;
    }
    return bestResult;
  }

  public OcrResult extractText(String base64Image) {
    try {
      String url = ocrServerUrl + "/ocr";

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);

      Map<String, String> body = Map.of("image", base64Image);
      HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

      ResponseEntity<OcrResult> response =
          restTemplate.exchange(url, HttpMethod.POST, request, OcrResult.class);

      return response.getBody() != null ? response.getBody() : OcrResult.empty();
    } catch (RestClientException e) {
      throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "OCR 서버 호출에 실패했습니다.");
    }
  }

  private byte[] downloadImage(String sourceImageUrl) {
    try {
      ResponseEntity<byte[]> response = restTemplate.getForEntity(sourceImageUrl, byte[].class);
      byte[] imageBytes = response.getBody();

      if (imageBytes == null || imageBytes.length == 0) {
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "OCR 대상 이미지를 내려받지 못했습니다.");
      }
      return imageBytes;
    } catch (RestClientException e) {
      throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "OCR 대상 이미지를 내려받는 데 실패했습니다.");
    }
  }

  private List<String> buildPreprocessedCandidates(String base64Image) {
    String normalizedBase64 = normalizeBase64(base64Image);
    Set<String> candidates = new LinkedHashSet<>();
    candidates.add(normalizedBase64);

    byte[] imageBytes;
    try {
      imageBytes = Base64.getDecoder().decode(normalizedBase64);
    } catch (IllegalArgumentException e) {
      return new ArrayList<>(candidates);
    }

    try {
      BufferedImage original = ImageIO.read(new ByteArrayInputStream(imageBytes));
      if (original == null) {
        return new ArrayList<>(candidates);
      }

      BufferedImage scaled = scaleForOcr(original);
      BufferedImage grayscale = toGrayscale(scaled);
      addPngCandidate(candidates, grayscale);
      addPngCandidate(candidates, toHighContrast(grayscale));
    } catch (IOException e) {
      return new ArrayList<>(candidates);
    }

    return new ArrayList<>(candidates);
  }

  private String normalizeBase64(String base64Image) {
    if (base64Image == null) {
      return "";
    }

    String value = base64Image.trim();
    int dataUrlSeparator = value.indexOf(',');
    if (value.startsWith("data:") && dataUrlSeparator >= 0) {
      value = value.substring(dataUrlSeparator + 1);
    }
    return value.replaceAll("\\s+", "");
  }

  private BufferedImage scaleForOcr(BufferedImage source) {
    int width = source.getWidth();
    int height = source.getHeight();
    if (width <= 0 || height <= 0) {
      return source;
    }

    int scale = width < MAX_SCALE_WIDTH / 2 && height < MAX_SCALE_HEIGHT / 2 ? 2 : 1;
    if (scale == 1) {
      return source;
    }

    BufferedImage scaled =
        new BufferedImage(width * scale, height * scale, BufferedImage.TYPE_INT_RGB);
    Graphics2D graphics = scaled.createGraphics();
    try {
      graphics.setColor(Color.WHITE);
      graphics.fillRect(0, 0, scaled.getWidth(), scaled.getHeight());
      graphics.setRenderingHint(
          RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
      graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
      graphics.drawImage(source, 0, 0, scaled.getWidth(), scaled.getHeight(), null);
    } finally {
      graphics.dispose();
    }
    return scaled;
  }

  private BufferedImage toGrayscale(BufferedImage source) {
    BufferedImage grayscale =
        new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
    Graphics2D graphics = grayscale.createGraphics();
    try {
      graphics.setColor(Color.WHITE);
      graphics.fillRect(0, 0, grayscale.getWidth(), grayscale.getHeight());
      graphics.drawImage(source, 0, 0, null);
    } finally {
      graphics.dispose();
    }
    return grayscale;
  }

  private BufferedImage toHighContrast(BufferedImage grayscale) {
    int width = grayscale.getWidth();
    int height = grayscale.getHeight();
    long luminanceSum = 0L;

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        luminanceSum += grayscale.getRGB(x, y) & 0xFF;
      }
    }

    int threshold = (int) (luminanceSum / Math.max(1, width * height));
    boolean darkBackground = threshold < 128;
    BufferedImage highContrast = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_BINARY);

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        int luminance = grayscale.getRGB(x, y) & 0xFF;
        boolean textPixel = darkBackground ? luminance > threshold : luminance <= threshold;
        highContrast.setRGB(x, y, textPixel ? Color.BLACK.getRGB() : Color.WHITE.getRGB());
      }
    }

    return highContrast;
  }

  private void addPngCandidate(Set<String> candidates, BufferedImage image) throws IOException {
    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    if (ImageIO.write(image, "png", outputStream)) {
      candidates.add(Base64.getEncoder().encodeToString(outputStream.toByteArray()));
    }
  }

  private boolean isBetterResult(OcrResult candidate, OcrResult currentBest) {
    return qualityScore(candidate) > qualityScore(currentBest);
  }

  private boolean isGoodEnough(OcrResult result) {
    return normalizedConfidence(result.getConfidence()) >= GOOD_ENOUGH_CONFIDENCE
        && extractedText(result).length() >= GOOD_ENOUGH_TEXT_LENGTH;
  }

  private boolean hasText(OcrResult result) {
    return !extractedText(result).isBlank();
  }

  private double qualityScore(OcrResult result) {
    String text = extractedText(result);
    double confidenceScore = normalizedConfidence(result.getConfidence());
    double textScore = Math.min(text.length() / 300.0D, 1.0D) * 0.20D;
    double lineScore =
        result.getLines() == null ? 0.0D : Math.min(result.getLines().size() / 8.0D, 1.0D) * 0.05D;
    return confidenceScore + textScore + lineScore;
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

  private String extractedText(OcrResult result) {
    if (result == null) {
      return "";
    }
    if (result.getText() != null && !result.getText().isBlank()) {
      return result.getText().trim();
    }
    if (result.getLines() == null || result.getLines().isEmpty()) {
      return "";
    }
    return result.getLines().stream()
        .filter(line -> line != null && !line.isBlank())
        .map(String::trim)
        .reduce((left, right) -> left + "\n" + right)
        .orElse("");
  }

  @Getter
  @NoArgsConstructor
  public static class OcrResult {

    private String text;
    private Double confidence;
    private List<String> lines;

    // 한글 주석: provider 응답이 비어 있어도 서비스 단에서 후처리할 수 있게 기본 객체를 만든다.
    public static OcrResult empty() {
      OcrResult result = new OcrResult();
      result.text = "";
      result.confidence = 0.0;
      result.lines = List.of();
      return result;
    }
  }
}

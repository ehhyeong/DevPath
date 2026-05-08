package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.OcrRequest;
import com.devpath.api.learning.dto.OcrResponse;
import com.devpath.api.learning.service.OcrService;
import com.devpath.common.provider.ClaudeOcrProvider;
import com.devpath.common.provider.OcrProvider;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 학습 - OCR", description = "OCR 추출 요청, OCR 결과 조회, OCR 검색, OCR 텍스트-타임스탬프 매핑 조회 API")
@RestController
@RequestMapping("/api/learning")
@RequiredArgsConstructor
public class OcrController {

  private final OcrService ocrService;
  private final OcrProvider ocrProvider;
  private final ClaudeOcrProvider claudeOcrProvider;

  @Operation(summary = "OCR 추출 요청", description = "특정 레슨 프레임 이미지에 대해 OCR 추출을 요청하고 결과를 저장합니다.")
  @PostMapping("/lessons/{lessonId}/ocr")
  public ResponseEntity<ApiResponse<OcrResponse.Detail>> extractText(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId,
      @Valid @RequestBody OcrRequest.Extract request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                "OCR 추출이 완료되었습니다.", ocrService.extractText(userId, lessonId, request)));
  }

  @Operation(
      summary = "Base64 이미지 즉시 OCR",
      description = "Claude Vision(최고) → Python OCR 서버 → 프론트 Tesseract 순 폴백. DB 저장 없이 결과만 반환합니다.")
  @PostMapping("/ocr/extract")
  public ResponseEntity<ApiResponse<Map<String, Object>>> extractFromBase64(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody OcrRequest.ExtractBase64 request) {
    String base64 = request.getImageBase64();

    // 1순위: Claude Vision API (ANTHROPIC_API_KEY 설정 시 자동 활성화)
    Optional<String> claudeText = claudeOcrProvider.extractText(base64);
    if (claudeText.isPresent()) {
      Map<String, Object> data =
          Map.of(
              "text",
              claudeText.get(),
              "confidence",
              1.0, // Claude는 자체 신뢰도 미제공 → 최고값 반환
              "lines",
              List.of(),
              "engine",
              "claude");
      return ResponseEntity.ok(ApiResponse.ok(data));
    }

    // 2순위: Python OCR 서버 (localhost:5000)
    try {
      OcrProvider.OcrResult result = ocrProvider.extractText(base64);
      Map<String, Object> data =
          Map.of(
              "text", result.getText() != null ? result.getText() : "",
              "confidence", result.getConfidence() != null ? result.getConfidence() : 0.0,
              "lines", result.getLines() != null ? result.getLines() : List.of(),
              "engine", "python");
      return ResponseEntity.ok(ApiResponse.ok(data));
    } catch (Exception e) {
      // Python 서버 미실행 → 프론트 Tesseract.js 폴백 유도
      Map<String, Object> data =
          Map.of("text", "", "confidence", 0.0, "lines", List.of(), "engine", "none");
      return ResponseEntity.ok(ApiResponse.ok(data));
    }
  }

  @Operation(summary = "OCR 단건 조회", description = "특정 OCR 결과를 단건 조회합니다.")
  @GetMapping("/ocr/{ocrId}")
  public ResponseEntity<ApiResponse<OcrResponse.Detail>> getOcrResult(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "OCR 결과 ID", example = "1") @PathVariable Long ocrId) {
    return ResponseEntity.ok(ApiResponse.ok(ocrService.getOcrResult(userId, ocrId)));
  }

  @Operation(summary = "OCR 텍스트 검색", description = "특정 레슨의 OCR 결과 중 키워드를 포함하는 텍스트를 검색합니다.")
  @GetMapping("/lessons/{lessonId}/ocr/search")
  public ResponseEntity<ApiResponse<OcrResponse.SearchResult>> searchOcrText(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId,
      @Parameter(description = "검색어", example = "security") @RequestParam String keyword) {
    return ResponseEntity.ok(ApiResponse.ok(ocrService.searchOcrText(userId, lessonId, keyword)));
  }

  @Operation(summary = "OCR 텍스트-타임스탬프 매핑 조회", description = "특정 레슨의 OCR 텍스트와 타임스탬프 매핑 목록을 조회합니다.")
  @GetMapping("/lessons/{lessonId}/ocr/mappings")
  public ResponseEntity<ApiResponse<OcrResponse.MappingResult>> getTimestampMappings(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId) {
    return ResponseEntity.ok(ApiResponse.ok(ocrService.getTimestampMappings(userId, lessonId)));
  }
}

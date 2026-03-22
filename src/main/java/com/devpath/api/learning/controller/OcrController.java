package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.OcrRequest;
import com.devpath.api.learning.dto.OcrResponse;
import com.devpath.api.learning.service.OcrService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
// OCR routes stay under the existing learning API namespace.
public class OcrController {

    private final OcrService ocrService;

    @Operation(summary = "OCR 추출 요청", description = "특정 레슨 프레임 이미지에 대해 OCR 추출을 요청하고 결과를 저장합니다.")
    @PostMapping("/lessons/{lessonId}/ocr")
    public ResponseEntity<ApiResponse<OcrResponse.Detail>> extractText(
            @AuthenticationPrincipal Long userId,
            @Parameter(description = "레슨 ID", example = "10")
            @PathVariable Long lessonId,
            @Valid @RequestBody OcrRequest.Extract request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("OCR 추출이 완료되었습니다.", ocrService.extractText(userId, lessonId, request)));
    }

    @Operation(summary = "OCR 단건 조회", description = "특정 OCR 결과를 단건 조회합니다.")
    @GetMapping("/ocr/{ocrId}")
    public ResponseEntity<ApiResponse<OcrResponse.Detail>> getOcrResult(
            @AuthenticationPrincipal Long userId,
            @Parameter(description = "OCR 결과 ID", example = "1")
            @PathVariable Long ocrId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(ocrService.getOcrResult(userId, ocrId)));
    }

    @Operation(summary = "OCR 텍스트 검색", description = "특정 레슨의 OCR 결과 중 키워드를 포함하는 텍스트를 검색합니다.")
    @GetMapping("/lessons/{lessonId}/ocr/search")
    public ResponseEntity<ApiResponse<OcrResponse.SearchResult>> searchOcrText(
            @AuthenticationPrincipal Long userId,
            @Parameter(description = "레슨 ID", example = "10")
            @PathVariable Long lessonId,
            @Parameter(description = "검색어", example = "security")
            @RequestParam String keyword
    ) {
        return ResponseEntity.ok(ApiResponse.ok(ocrService.searchOcrText(userId, lessonId, keyword)));
    }

    @Operation(summary = "OCR 텍스트-타임스탬프 매핑 조회", description = "특정 레슨의 OCR 텍스트와 타임스탬프 매핑 목록을 조회합니다.")
    @GetMapping("/lessons/{lessonId}/ocr/mappings")
    public ResponseEntity<ApiResponse<OcrResponse.MappingResult>> getTimestampMappings(
            @AuthenticationPrincipal Long userId,
            @Parameter(description = "레슨 ID", example = "10")
            @PathVariable Long lessonId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(ocrService.getTimestampMappings(userId, lessonId)));
    }
}

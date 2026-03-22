package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.OcrResultResponse;
import com.devpath.api.learning.dto.OcrTimestampMappingResponse;
import com.devpath.api.learning.service.OcrService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "OCR", description = "강의 영상 프레임 OCR 텍스트 추출 및 조회 API")
@RestController
@RequestMapping("/api/learning/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final OcrService ocrService;

    @Operation(summary = "OCR 추출 및 저장",
            description = "base64 인코딩된 영상 프레임 이미지를 Flask OCR 서버로 전송하여 텍스트를 추출하고 결과를 저장합니다.")
    @PostMapping("/lessons/{lessonId}/extract")
    public ResponseEntity<ApiResponse<OcrResultResponse>> extractAndSave(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long lessonId,
            @RequestParam Integer frameTimestampSecond,
            @RequestBody String base64Image
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(ocrService.extractAndSave(userId, lessonId, frameTimestampSecond, base64Image)));
    }

    @Operation(summary = "레슨 OCR 결과 목록 조회",
            description = "특정 레슨의 OCR 결과를 타임스탬프 순으로 조회합니다.")
    @GetMapping("/lessons/{lessonId}")
    public ResponseEntity<ApiResponse<List<OcrResultResponse>>> getOcrResults(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long lessonId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(ocrService.getOcrResults(userId, lessonId)));
    }

    @Operation(summary = "OCR 결과 단건 조회", description = "OCR 결과 ID로 특정 결과를 조회합니다.")
    @GetMapping("/{ocrId}")
    public ResponseEntity<ApiResponse<OcrResultResponse>> getOcrResult(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long ocrId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(ocrService.getOcrResult(userId, ocrId)));
    }

    @Operation(summary = "OCR 키워드 검색",
            description = "특정 레슨의 OCR 추출 텍스트에서 키워드를 검색합니다.")
    @GetMapping("/lessons/{lessonId}/search")
    public ResponseEntity<ApiResponse<List<OcrResultResponse>>> searchByKeyword(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long lessonId,
            @RequestParam String keyword
    ) {
        return ResponseEntity.ok(ApiResponse.ok(ocrService.searchByKeyword(userId, lessonId, keyword)));
    }

    @Operation(summary = "OCR 타임스탬프 매핑 조회",
            description = "특정 레슨의 OCR 결과 전체를 타임스탬프(mm:ss) 매핑 형태로 반환합니다. keyword 지정 시 해당 구간에 matched=true가 표시됩니다.")
    @GetMapping("/lessons/{lessonId}/timestamp-mapping")
    public ResponseEntity<ApiResponse<List<OcrTimestampMappingResponse>>> getTimestampMapping(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long lessonId,
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(ApiResponse.ok(ocrService.getTimestampMapping(userId, lessonId, keyword)));
    }
}

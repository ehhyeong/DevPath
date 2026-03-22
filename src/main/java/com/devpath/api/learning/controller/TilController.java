package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.TilRequest;
import com.devpath.api.learning.dto.TilResponse;
import com.devpath.api.learning.service.TilService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "강의 학습 - TIL", description = "TIL 초안 저장, 노트 변환, 조회 API")
@RestController
@RequestMapping("/api/learning/til")
@RequiredArgsConstructor
public class TilController {

    private final TilService tilService;

    @Operation(summary = "TIL 초안 저장", description = "TIL을 직접 작성하여 초안으로 저장합니다.")
    @PostMapping("/draft")
    public ResponseEntity<ApiResponse<TilResponse>> createTil(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody TilRequest.Create request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(tilService.createTil(userId, request)));
    }

    @Operation(summary = "TIL 단건 조회", description = "TIL ID로 특정 TIL을 조회합니다.")
    @GetMapping("/{tilId}")
    public ResponseEntity<ApiResponse<TilResponse>> getTil(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long tilId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.getTil(userId, tilId)));
    }

    @Operation(summary = "TIL 목록 조회", description = "내 TIL 목록을 최신순으로 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TilResponse>>> getTilList(
            @AuthenticationPrincipal Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.getTilList(userId)));
    }

    @Operation(summary = "TIL 수정", description = "저장된 TIL의 제목과 본문을 수정합니다.")
    @PutMapping("/{tilId}")
    public ResponseEntity<ApiResponse<TilResponse>> updateTil(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long tilId,
            @Valid @RequestBody TilRequest.Update request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.updateTil(userId, tilId, request)));
    }

    @Operation(summary = "노트 → TIL 자동 변환", description = "선택한 타임스탬프 노트들을 타임스탬프 순으로 정렬하여 TIL 초안으로 변환합니다.")
    @PostMapping("/convert")
    public ResponseEntity<ApiResponse<TilResponse>> convertFromNotes(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody TilRequest.ConvertFromNotes request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(tilService.convertFromNotes(userId, request)));
    }

    @Operation(summary = "외부 블로그 발행", description = "작성한 TIL을 외부 블로그에 발행합니다. (현재 stub 구현)")
    @PostMapping("/{tilId}/publish")
    public ResponseEntity<ApiResponse<TilResponse>> publishToExternalBlog(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long tilId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.publishToExternalBlog(userId, tilId)));
    }

    @Operation(summary = "TIL 자동 목차화", description = "TIL 본문의 마크다운 헤더(#, ##, ###)를 파싱하여 목차를 자동 생성합니다.")
    @PostMapping("/{tilId}/toc")
    public ResponseEntity<ApiResponse<TilResponse>> generateTableOfContents(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long tilId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.generateTableOfContents(userId, tilId)));
    }
}

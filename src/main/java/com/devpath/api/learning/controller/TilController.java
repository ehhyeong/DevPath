package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.TilPublishRequest;
import com.devpath.api.learning.dto.TilPublishResponse;
import com.devpath.api.learning.dto.TilRequest;
import com.devpath.api.learning.dto.TilResponse;
import com.devpath.api.learning.service.TilService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "학습자 - TIL", description = "TIL 초안 저장, 노트 변환, 조회, 외부 블로그 발행 API")
@RestController
@RequestMapping("/api/learning/til")
@RequiredArgsConstructor
public class TilController {

  private final TilService tilService;

  @Operation(summary = "TIL 초안 생성", description = "TIL 초안을 생성합니다.")
  @PostMapping("/draft")
  public ResponseEntity<ApiResponse<TilResponse>> createTil(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody TilRequest.Create request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(tilService.createTil(userId, request)));
  }

  @Operation(summary = "TIL 단건 조회", description = "TIL ID 기준으로 단건 조회합니다.")
  @GetMapping("/{tilId}")
  public ResponseEntity<ApiResponse<TilResponse>> getTil(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "TIL 식별자", example = "1") @PathVariable Long tilId) {
    return ResponseEntity.ok(ApiResponse.ok(tilService.getTil(userId, tilId)));
  }

  @Operation(summary = "TIL 목록 조회", description = "TIL 목록을 최신순으로 조회합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<List<TilResponse>>> getTilList(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(tilService.getTilList(userId)));
  }

  @Operation(summary = "TIL 수정", description = "TIL 제목과 내용을 수정합니다.")
  @PutMapping("/{tilId}")
  public ResponseEntity<ApiResponse<TilResponse>> updateTil(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "TIL 식별자", example = "1") @PathVariable Long tilId,
      @Valid @RequestBody TilRequest.Update request) {
    return ResponseEntity.ok(ApiResponse.ok(tilService.updateTil(userId, tilId, request)));
  }

  @Operation(summary = "노트 기반 TIL 변환", description = "타임스탬프 노트를 TIL 초안으로 변환합니다.")
  @PostMapping("/convert")
  public ResponseEntity<ApiResponse<TilResponse>> convertFromNotes(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody TilRequest.ConvertFromNotes request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(tilService.convertFromNotes(userId, request)));
  }

  @Operation(summary = "TIL 외부 블로그 발행", description = "TIL을 외부 블로그로 발행합니다.")
  @PostMapping("/{tilId}/publish")
  public ResponseEntity<ApiResponse<TilPublishResponse>> publishToExternalBlog(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "TIL 식별자", example = "1") @PathVariable Long tilId,
      @Valid @RequestBody TilPublishRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(tilService.publishToExternalBlog(userId, tilId, request)));
  }

  @Operation(summary = "TIL 목차 생성", description = "마크다운 헤더를 기반으로 TIL 목차를 생성합니다.")
  @PostMapping("/{tilId}/toc")
  public ResponseEntity<ApiResponse<TilResponse>> generateTableOfContents(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "TIL 식별자", example = "1") @PathVariable Long tilId) {
    return ResponseEntity.ok(ApiResponse.ok(tilService.generateTableOfContents(userId, tilId)));
  }
}

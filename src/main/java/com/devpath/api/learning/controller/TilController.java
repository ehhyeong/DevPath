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

@Tag(name = "Learner - TIL", description = "TIL 초안 저장, 노트 변환, 조회, 외부 블로그 발행 API")
@RestController
@RequestMapping("/api/learning/til")
@RequiredArgsConstructor
public class TilController {

    private final TilService tilService;

    @Operation(summary = "Create TIL draft", description = "Creates a TIL draft.")
    @PostMapping("/draft")
    public ResponseEntity<ApiResponse<TilResponse>> createTil(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Valid @RequestBody TilRequest.Create request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(tilService.createTil(userId, request)));
    }

    @Operation(summary = "Get TIL", description = "Returns a single TIL by id.")
    @GetMapping("/{tilId}")
    public ResponseEntity<ApiResponse<TilResponse>> getTil(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "TIL id", example = "1") @PathVariable Long tilId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.getTil(userId, tilId)));
    }

    @Operation(summary = "Get TIL list", description = "Returns TILs in reverse chronological order.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TilResponse>>> getTilList(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.getTilList(userId)));
    }

    @Operation(summary = "Update TIL", description = "Updates a TIL title and content.")
    @PutMapping("/{tilId}")
    public ResponseEntity<ApiResponse<TilResponse>> updateTil(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "TIL id", example = "1") @PathVariable Long tilId,
        @Valid @RequestBody TilRequest.Update request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.updateTil(userId, tilId, request)));
    }

    @Operation(summary = "Convert notes to TIL", description = "Converts timestamp notes into a TIL draft.")
    @PostMapping("/convert")
    public ResponseEntity<ApiResponse<TilResponse>> convertFromNotes(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Valid @RequestBody TilRequest.ConvertFromNotes request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(tilService.convertFromNotes(userId, request)));
    }

    @Operation(summary = "Publish TIL", description = "Publishes a TIL to an external blog.")
    @PostMapping("/{tilId}/publish")
    public ResponseEntity<ApiResponse<TilPublishResponse>> publishToExternalBlog(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "TIL id", example = "1") @PathVariable Long tilId,
        @Valid @RequestBody TilPublishRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(tilService.publishToExternalBlog(userId, tilId, request)));
    }

    @Operation(summary = "Generate TIL table of contents", description = "Generates a table of contents from markdown headers.")
    @PostMapping("/{tilId}/toc")
    public ResponseEntity<ApiResponse<TilResponse>> generateTableOfContents(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "TIL id", example = "1") @PathVariable Long tilId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(tilService.generateTableOfContents(userId, tilId)));
    }
}

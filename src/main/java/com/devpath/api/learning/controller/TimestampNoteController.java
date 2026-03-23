package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.TimestampNoteRequest;
import com.devpath.api.learning.dto.TimestampNoteResponse;
import com.devpath.api.learning.service.TimestampNoteService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 학습 - 타임스탬프 노트", description = "강의 구간별 노트 저장, 조회, 수정, 삭제 API")
@RestController
@RequestMapping("/api/learning/lessons")
@RequiredArgsConstructor
public class TimestampNoteController {

    private final TimestampNoteService timestampNoteService;

    @Operation(
            summary = "타임스탬프 노트 저장",
            description = "timestampSecond 또는 timestampText 값을 받아 정규화된 초 단위 값으로 노트를 저장합니다."
    )
    @PostMapping("/{lessonId}/notes")
    public ResponseEntity<ApiResponse<TimestampNoteResponse>> createNote(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId,
            @Valid @RequestBody TimestampNoteRequest.Create request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(timestampNoteService.createNote(userId, lessonId, request)));
    }

    @Operation(
            summary = "타임스탬프 노트 목록 조회",
            description = "특정 레슨의 노트를 timestampSecond 오름차순으로 조회합니다."
    )
    @GetMapping("/{lessonId}/notes")
    public ResponseEntity<ApiResponse<List<TimestampNoteResponse>>> getNotes(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(timestampNoteService.getNotes(userId, lessonId)));
    }

    @Operation(
            summary = "타임스탬프 노트 수정",
            description = "timestampSecond 또는 timestampText 값을 다시 받아 노트의 위치와 내용을 수정합니다."
    )
    @PutMapping("/{lessonId}/notes/{noteId}")
    public ResponseEntity<ApiResponse<TimestampNoteResponse>> updateNote(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId,
            @Parameter(description = "노트 ID", example = "1") @PathVariable Long noteId,
            @Valid @RequestBody TimestampNoteRequest.Update request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                timestampNoteService.updateNote(userId, lessonId, noteId, request)
        ));
    }

    @Operation(summary = "타임스탬프 노트 삭제", description = "저장된 노트를 삭제합니다.")
    @DeleteMapping("/{lessonId}/notes/{noteId}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId,
            @Parameter(description = "노트 ID", example = "1") @PathVariable Long noteId
    ) {
        timestampNoteService.deleteNote(userId, lessonId, noteId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}

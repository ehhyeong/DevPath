package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.LessonProgressRequest;
import com.devpath.api.learning.dto.LessonProgressResponse;
import com.devpath.api.learning.service.LessonProgressService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Lesson Progress", description = "Lesson progress APIs")
@RestController
@RequestMapping("/api/learning/sessions")
@RequiredArgsConstructor
public class LessonProgressController {

    private final LessonProgressService lessonProgressService;

    @Operation(
            summary = "Start lesson session",
            description = "Creates a lesson progress record on first entry and returns the resume position."
    )
    @PostMapping("/{lessonId}/start")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> startSession(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "Lesson ID", example = "10") @PathVariable Long lessonId
    ) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.ok(lessonProgressService.startSession(userId, lessonId)));
    }

    @Operation(
            summary = "Save progress",
            description = "Saves the current playback position and progress percent. Completion and last watched time are updated together."
    )
    @PutMapping("/{lessonId}/progress")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> saveProgress(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "Lesson ID", example = "10") @PathVariable Long lessonId,
            @Valid @RequestBody LessonProgressRequest.SaveProgress request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(lessonProgressService.saveProgress(userId, lessonId, request)));
    }

    @Operation(
            summary = "Get progress",
            description = "Returns the current progress, playback position, completion flag, and last watched time."
    )
    @GetMapping("/{lessonId}/progress")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> getProgress(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "Lesson ID", example = "10") @PathVariable Long lessonId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(lessonProgressService.getProgress(userId, lessonId)));
    }
}

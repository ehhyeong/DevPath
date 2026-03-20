package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.SaveWrongAnswerNoteRequest;
import com.devpath.api.evaluation.dto.response.WrongAnswerNoteResponse;
import com.devpath.api.evaluation.service.WrongAnswerNoteService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Learner - Wrong Answer Note", description = "학습자 오답 노트 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/learner/wrong-answer-notes")
public class WrongAnswerNoteController {

    private final WrongAnswerNoteService wrongAnswerNoteService;

    @Operation(summary = "오답 노트 저장", description = "학습자가 자신의 오답 문항에 대해 오답 노트를 저장합니다.")
    @PostMapping("/attempts/{attemptId}")
    public ResponseEntity<ApiResponse<WrongAnswerNoteResponse>> saveWrongAnswerNote(
            @Parameter(description = "학습자 ID", example = "1")
            @RequestParam Long userId,
            @Parameter(description = "응시 ID", example = "100")
            @PathVariable Long attemptId,
            @Valid @RequestBody SaveWrongAnswerNoteRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "오답 노트가 저장되었습니다.",
                wrongAnswerNoteService.saveWrongAnswerNote(userId, attemptId, request)
        ));
    }
}

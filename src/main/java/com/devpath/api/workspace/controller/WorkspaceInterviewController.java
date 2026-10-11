package com.devpath.api.workspace.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceInterviewRequest.*;
import com.devpath.api.workspace.service.WorkspaceInterviewService;
import com.devpath.common.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/interview")
@RequiredArgsConstructor
public class WorkspaceInterviewController {
  private final WorkspaceInterviewService service;

  @GetMapping("/shared-answers")
  public ApiResponse<List<SharedAnswer>> sharedAnswers(
      @PathVariable Long workspaceId, @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(service.getSharedAnswers(workspaceId, requireUserId(userId)));
  }

  @PostMapping("/shared-answers")
  public ApiResponse<List<SharedAnswer>> shareAnswer(
      @PathVariable Long workspaceId,
      @AuthenticationPrincipal Long userId,
      @Valid @RequestBody Share request) {
    return ApiResponse.ok(service.shareAnswer(workspaceId, requireUserId(userId), request));
  }

  @GetMapping("/practice")
  public ApiResponse<Practice> getPractice(
      @PathVariable Long workspaceId, @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(service.getPractice(workspaceId, requireUserId(userId)));
  }

  @PutMapping("/practice")
  public ApiResponse<Practice> savePractice(
      @PathVariable Long workspaceId,
      @AuthenticationPrincipal Long userId,
      @Valid @RequestBody Practice request) {
    return ApiResponse.ok(service.savePractice(workspaceId, requireUserId(userId), request));
  }

  @GetMapping("/questions")
  public ApiResponse<Questions> getQuestions(
      @PathVariable Long workspaceId, @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(service.getQuestions(workspaceId, requireUserId(userId)));
  }

  @PutMapping("/questions")
  public ApiResponse<Questions> saveQuestions(
      @PathVariable Long workspaceId,
      @AuthenticationPrincipal Long userId,
      @Valid @RequestBody Questions request) {
    return ApiResponse.ok(service.saveQuestions(workspaceId, requireUserId(userId), request));
  }

  @PostMapping("/questions/generate")
  public ApiResponse<Questions> generate(
      @PathVariable Long workspaceId, @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(service.generateQuestions(workspaceId, requireUserId(userId)));
  }

  @PostMapping("/evaluate")
  public ApiResponse<Feedback> evaluate(
      @PathVariable Long workspaceId,
      @AuthenticationPrincipal Long userId,
      @Valid @RequestBody Evaluation request) {
    return ApiResponse.ok(service.evaluate(workspaceId, requireUserId(userId), request));
  }
}

package com.devpath.api.squad.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.squad.dto.SquadLoungePostRequest;
import com.devpath.api.squad.dto.SquadLoungePostResponse;
import com.devpath.api.squad.service.SquadLoungePostService;
import com.devpath.common.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lounge/squads")
@RequiredArgsConstructor
public class SquadLoungePostController {

  private final SquadLoungePostService squadLoungePostService;

  @GetMapping
  public ApiResponse<List<SquadLoungePostResponse>> getPosts() {
    return ApiResponse.ok(squadLoungePostService.getPosts());
  }

  @GetMapping("/{squadId}")
  public ApiResponse<SquadLoungePostResponse> getPost(@PathVariable Long squadId) {
    return ApiResponse.ok(squadLoungePostService.getPost(squadId));
  }

  @PostMapping
  public ApiResponse<SquadLoungePostResponse> createPost(
      @AuthenticationPrincipal Long userId, @Valid @RequestBody SquadLoungePostRequest request) {
    return ApiResponse.ok(squadLoungePostService.createPost(requireUserId(userId), request));
  }

  @PutMapping("/{squadId}")
  public ApiResponse<SquadLoungePostResponse> updatePost(
      @PathVariable Long squadId,
      @AuthenticationPrincipal Long userId,
      @Valid @RequestBody SquadLoungePostRequest request) {
    return ApiResponse.ok(
        squadLoungePostService.updatePost(squadId, requireUserId(userId), request));
  }

  @PatchMapping("/{squadId}/close")
  public ApiResponse<SquadLoungePostResponse> closePost(
      @PathVariable Long squadId, @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(squadLoungePostService.closePost(squadId, requireUserId(userId)));
  }
}

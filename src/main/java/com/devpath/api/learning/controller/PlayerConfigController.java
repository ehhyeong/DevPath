package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.PlayerConfigRequest;
import com.devpath.api.learning.dto.PlayerConfigResponse;
import com.devpath.api.learning.service.PlayerConfigService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 학습 - 플레이어 설정", description = "PIP 모드 및 재생 속도 설정 조회/저장 API")
@RestController
@RequestMapping("/api/learning/player")
@RequiredArgsConstructor
public class PlayerConfigController {

  private final PlayerConfigService playerConfigService;

  @Operation(summary = "플레이어 설정 조회", description = "저장한 재생 속도와 PIP 모드 설정을 조회합니다.")
  @GetMapping("/{lessonId}/config")
  public ResponseEntity<ApiResponse<PlayerConfigResponse>> getPlayerConfig(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId) {
    return ResponseEntity.ok(ApiResponse.ok(playerConfigService.getPlayerConfig(userId, lessonId)));
  }

  @Operation(summary = "재생 속도 저장", description = "사용자가 설정한 기본 재생 속도를 저장합니다.")
  @PutMapping("/{lessonId}/config")
  public ResponseEntity<ApiResponse<PlayerConfigResponse>> updatePlaybackRate(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId,
      @Valid @RequestBody PlayerConfigRequest.UpdatePlaybackRate request) {
    return ResponseEntity.ok(
        ApiResponse.ok(playerConfigService.updatePlaybackRate(userId, lessonId, request)));
  }

  @Operation(summary = "PIP 모드 설정 저장", description = "강의 플레이어의 PIP 모드 활성화 여부를 저장합니다.")
  @PatchMapping("/{lessonId}/config/pip")
  public ResponseEntity<ApiResponse<PlayerConfigResponse>> updatePipMode(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "레슨 ID", example = "10") @PathVariable Long lessonId,
      @Valid @RequestBody PlayerConfigRequest.UpdatePipMode request) {
    return ResponseEntity.ok(
        ApiResponse.ok(playerConfigService.updatePipMode(userId, lessonId, request)));
  }
}

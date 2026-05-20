package com.devpath.api.builder.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.builder.dto.BuilderModuleDto;
import com.devpath.api.builder.dto.MyRoadmapResponse;
import com.devpath.api.builder.dto.MyRoadmapSaveRequest;
import com.devpath.api.builder.dto.MyRoadmapSummary;
import com.devpath.api.builder.service.BuilderModuleService;
import com.devpath.api.builder.service.MyRoadmapService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "로드맵 빌더", description = "나만의 로드맵 빌더 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/builder")
public class BuilderController {

  private final BuilderModuleService builderModuleService;
  private final MyRoadmapService myRoadmapService;

  @Operation(summary = "빌더 모듈 목록 조회", description = "카테고리별 빌더 모듈 목록을 조회합니다.")
  @GetMapping("/modules")
  public ResponseEntity<ApiResponse<List<BuilderModuleDto>>> getModules(
      @Parameter(description = "카테고리 키 (예: backend, frontend)", example = "backend") @RequestParam
          String category) {
    return ResponseEntity.ok(ApiResponse.ok(builderModuleService.getModulesByCategory(category)));
  }

  @Operation(summary = "나만의 로드맵 저장", description = "빌더에서 구성한 로드맵을 저장합니다.")
  @PostMapping("/roadmaps")
  public ResponseEntity<ApiResponse<MyRoadmapResponse>> saveRoadmap(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody MyRoadmapSaveRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "나만의 로드맵이 저장되었습니다.", myRoadmapService.save(requireUserId(userId), request)));
  }

  @Operation(summary = "나만의 로드맵 목록 조회", description = "사용자의 나만의 로드맵 목록을 최신순으로 조회합니다.")
  @GetMapping("/roadmaps")
  public ResponseEntity<ApiResponse<List<MyRoadmapSummary>>> getRoadmaps(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(myRoadmapService.findAll(requireUserId(userId))));
  }

  @Operation(summary = "나만의 로드맵 상세 조회", description = "나만의 로드맵 상세(모듈 포함)를 조회합니다.")
  @GetMapping("/roadmaps/{id}")
  public ResponseEntity<ApiResponse<MyRoadmapResponse>> getRoadmap(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "나만의 로드맵 ID", example = "1") @PathVariable Long id) {
    return ResponseEntity.ok(ApiResponse.ok(myRoadmapService.findById(requireUserId(userId), id)));
  }

  @Operation(summary = "나만의 로드맵 수정", description = "빌더에서 구성한 로드맵을 수정합니다. 기존 모듈과 연결된 CustomRoadmap 노드를 교체합니다.")
  @PutMapping("/roadmaps/{id}")
  public ResponseEntity<ApiResponse<MyRoadmapResponse>> updateRoadmap(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "나만의 로드맵 ID", example = "1") @PathVariable Long id,
      @Valid @RequestBody MyRoadmapSaveRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "나만의 로드맵이 수정되었습니다.", myRoadmapService.update(requireUserId(userId), id, request)));
  }

  @Operation(summary = "나만의 로드맵 삭제", description = "나만의 로드맵을 삭제합니다. 모듈도 함께 삭제됩니다.")
  @DeleteMapping("/roadmaps/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteRoadmap(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "나만의 로드맵 ID", example = "1") @PathVariable Long id) {
    myRoadmapService.delete(requireUserId(userId), id);
    return ResponseEntity.ok(ApiResponse.ok());
  }
}

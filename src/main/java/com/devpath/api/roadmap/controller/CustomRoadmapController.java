package com.devpath.api.roadmap.controller;

import com.devpath.api.roadmap.dto.CustomRoadmapCopyDto;
import com.devpath.api.roadmap.dto.MyRoadmapDto;
import com.devpath.api.roadmap.service.CustomRoadmapCopyService;
import com.devpath.api.roadmap.service.CustomRoadmapQueryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Custom Roadmap", description = "학습자 커스텀 로드맵 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/my-roadmaps")
public class CustomRoadmapController {

  private final CustomRoadmapCopyService customRoadmapCopyService;
  private final CustomRoadmapQueryService customRoadmapQueryService;

  @Operation(
      summary = "내 커스텀 로드맵 목록 조회",
      description = "사용자의 커스텀 로드맵 목록을 최신순으로 조회합니다. (JWT 적용 전 userId 임시 파라미터)")
  @GetMapping
  public ResponseEntity<ApiResponse<MyRoadmapDto.ListResponse>> getMyRoadmaps(
      @Parameter(description = "유저 ID (JWT 적용 전 임시)", example = "1") @RequestParam Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            MyRoadmapDto.ListResponse.from(customRoadmapQueryService.getMyRoadmaps(userId))));
  }

  @Operation(
      summary = "내 커스텀 로드맵 상세 조회",
      description =
          """
                    커스텀 로드맵 상세와 노드 상태를 조회합니다.
                    예: 유저 태그가 Java, Spring이면 복사 직후 해당 요구 태그를 가진 노드는 COMPLETED 상태로 조회됩니다.
                    (JWT 적용 전 userId 임시 파라미터)
                    """)
  @GetMapping("/{customRoadmapId}")
  public ResponseEntity<ApiResponse<MyRoadmapDto.DetailResponse>> getMyRoadmap(
      @Parameter(description = "유저 ID (JWT 적용 전 임시)", example = "1") @RequestParam Long userId,
      @Parameter(description = "커스텀 로드맵 ID", example = "10") @PathVariable Long customRoadmapId) {
    return ResponseEntity.ok(
        ApiResponse.ok(customRoadmapQueryService.getMyRoadmap(userId, customRoadmapId)));
  }

  @Operation(
      summary = "오피셜 로드맵 복사",
      description =
          """
                    오피셜 로드맵을 사용자 커스텀 로드맵으로 복사합니다.
                    사용자가 이미 보유한 태그를 만족하는 노드는 복사 시 COMPLETED 상태로 생성됩니다.
                    예: 유저 태그가 Java, Spring이면 해당 요구 태그를 가진 노드는 복사 직후 완료 처리됩니다.
                    (JWT 적용 전 userId 임시 파라미터)
                    """)
  @PostMapping("/{roadmapId}")
  public ResponseEntity<ApiResponse<CustomRoadmapCopyDto.Response>> copy(
      @Parameter(description = "유저 ID (JWT 적용 전 임시)", example = "1") @RequestParam Long userId,
      @Parameter(description = "복사할 오피셜 로드맵 ID", example = "1") @PathVariable Long roadmapId) {
    Long customRoadmapId = customRoadmapCopyService.copyToCustomRoadmap(userId, roadmapId);
    return ResponseEntity.ok(
        ApiResponse.success(
            "커스텀 로드맵이 생성되었습니다.", CustomRoadmapCopyDto.Response.of(customRoadmapId)));
  }

  @Operation(summary = "내 커스텀 로드맵 삭제", description = "커스텀 로드맵을 삭제합니다. (JWT 적용 전 userId 임시 파라미터)")
  @DeleteMapping("/{customRoadmapId}")
  public ResponseEntity<ApiResponse<Void>> deleteMyRoadmap(
      @RequestParam Long userId, @PathVariable Long customRoadmapId) {
    customRoadmapQueryService.deleteMyRoadmap(userId, customRoadmapId);
    return ResponseEntity.ok(ApiResponse.ok());
  }
}

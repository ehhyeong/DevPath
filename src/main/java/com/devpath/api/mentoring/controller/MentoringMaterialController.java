package com.devpath.api.mentoring.controller;

import com.devpath.api.mentoring.dto.MentoringMaterialRequest;
import com.devpath.api.mentoring.dto.MentoringMaterialResponse;
import com.devpath.api.mentoring.service.MentoringMaterialService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.MENTORING_MATERIAL, description = "멘토링 미션 자료 CRUD API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MentoringMaterialController {

  private final MentoringMaterialService mentoringMaterialService;

  @PostMapping("/mentoring-missions/{missionId}/materials")
  @Operation(summary = "미션 자료 등록", description = "미션에 URL 자료 또는 TEXT 가이드라인을 등록합니다.")
  public ResponseEntity<ApiResponse<MentoringMaterialResponse.Detail>> create(
      @PathVariable Long missionId, @Valid @RequestBody MentoringMaterialRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringMaterialService.create(missionId, request)));
  }

  @GetMapping("/mentoring-missions/{missionId}/materials")
  @Operation(summary = "미션 자료 목록 조회", description = "미션에 연결된 자료 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MentoringMaterialResponse.Summary>>> getMaterials(
      @PathVariable Long missionId) {
    // 자료 목록은 sortOrder 오름차순으로 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringMaterialService.getMaterials(missionId)));
  }

  @PatchMapping("/mentoring-materials/{materialId}")
  @Operation(summary = "미션 자료 수정", description = "미션 자료 제목, 내용, URL을 수정합니다.")
  public ResponseEntity<ApiResponse<MentoringMaterialResponse.Detail>> update(
      @PathVariable Long materialId, @Valid @RequestBody MentoringMaterialRequest.Update request) {
    // 수정 권한과 타입별 필수값 검증은 Service에서 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringMaterialService.update(materialId, request)));
  }

  @DeleteMapping("/mentoring-materials/{materialId}")
  @Operation(summary = "미션 자료 삭제", description = "미션 자료를 Soft Delete 처리합니다.")
  public ResponseEntity<ApiResponse<Void>> delete(
      @PathVariable Long materialId,
      @Parameter(description = "멘토 사용자 ID", example = "1") @RequestParam Long mentorId) {
    // 삭제는 물리 삭제가 아니라 isDeleted=true로 처리한다.
    mentoringMaterialService.delete(materialId, mentorId);
    return ResponseEntity.ok(ApiResponse.ok());
  }
}

package com.devpath.api.mentoring.controller;

import com.devpath.api.mentoring.dto.MentoringMissionRequest;
import com.devpath.api.mentoring.dto.MentoringMissionResponse;
import com.devpath.api.mentoring.service.MentoringMissionService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.MENTORING_MISSION, description = "멘토링 주차별 미션 CRUD API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MentoringMissionController {

  private final MentoringMissionService mentoringMissionService;

  @PostMapping("/mentorings/{mentoringId}/missions")
  @Operation(summary = "멘토링 미션 생성", description = "멘토링에 주차별 미션을 생성합니다.")
  public ResponseEntity<ApiResponse<MentoringMissionResponse.Detail>> create(
      @PathVariable Long mentoringId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long mentorId,
      @Valid @RequestBody MentoringMissionRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(
        ApiResponse.ok(mentoringMissionService.create(mentoringId, mentorId, request)));
  }

  @GetMapping("/mentorings/{mentoringId}/missions")
  @Operation(summary = "멘토링 미션 목록 조회", description = "멘토링 ID 기준 미션 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MentoringMissionResponse.Summary>>> getMissions(
      @PathVariable Long mentoringId) {
    // 미션 목록은 주차 번호 오름차순으로 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringMissionService.getMissions(mentoringId)));
  }

  @GetMapping("/mentoring-missions/{missionId}")
  @Operation(summary = "멘토링 미션 단건 조회", description = "미션 상세 정보를 조회합니다.")
  public ResponseEntity<ApiResponse<MentoringMissionResponse.Detail>> getMission(
      @PathVariable Long missionId) {
    // Entity를 직접 반환하지 않고 상세 DTO로 변환된 결과를 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringMissionService.getMission(missionId)));
  }

  @PatchMapping("/mentoring-missions/{missionId}")
  @Operation(summary = "멘토링 미션 수정", description = "미션 제목, 설명, 상태, 마감일을 수정합니다.")
  public ResponseEntity<ApiResponse<MentoringMissionResponse.Detail>> update(
      @PathVariable Long missionId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long mentorId,
      @Valid @RequestBody MentoringMissionRequest.Update request) {
    // 수정 권한과 주차 중복 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(mentoringMissionService.update(missionId, mentorId, request)));
  }

  @DeleteMapping("/mentoring-missions/{missionId}")
  @Operation(summary = "멘토링 미션 삭제", description = "미션을 Soft Delete 처리합니다.")
  public ResponseEntity<ApiResponse<Void>> delete(
      @PathVariable Long missionId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long mentorId) {
    // 삭제는 물리 삭제가 아니라 isDeleted=true로 처리한다.
    mentoringMissionService.delete(missionId, mentorId);
    return ResponseEntity.ok(ApiResponse.ok());
  }
}

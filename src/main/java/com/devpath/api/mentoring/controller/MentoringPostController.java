package com.devpath.api.mentoring.controller;

import com.devpath.api.mentoring.dto.MentoringPostRequest;
import com.devpath.api.mentoring.dto.MentoringPostResponse;
import com.devpath.api.mentoring.service.MentoringPostService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import io.swagger.v3.oas.annotations.Operation;
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

@Tag(name = SwaggerTag.MENTORING_POST, description = "멘토링 공고 CRUD API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mentoring-posts")
public class MentoringPostController {

  private final MentoringPostService mentoringPostService;

  @PostMapping
  @Operation(summary = "멘토링 공고 등록", description = "멘토가 멘토링 공고를 등록합니다.")
  public ResponseEntity<ApiResponse<MentoringPostResponse.Detail>> create(
      @Valid @RequestBody MentoringPostRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringPostService.create(request)));
  }

  @GetMapping
  @Operation(summary = "멘토링 공고 목록 조회", description = "삭제되지 않은 멘토링 공고 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MentoringPostResponse.Summary>>> getPosts(
      @RequestParam(required = false) MentoringPostStatus status) {
    // status query parameter로 OPEN/CLOSED 필터링을 지원한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringPostService.getPosts(status)));
  }

  @GetMapping("/{postId}")
  @Operation(summary = "멘토링 공고 단건 조회", description = "멘토링 공고 상세 정보를 조회합니다.")
  public ResponseEntity<ApiResponse<MentoringPostResponse.Detail>> getPost(
      @PathVariable Long postId) {
    // PathVariable만 Service로 전달하고 조회 로직은 Service에서 처리한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringPostService.getPost(postId)));
  }

  @PatchMapping("/{postId}")
  @Operation(summary = "멘토링 공고 수정", description = "멘토링 공고 정보를 수정합니다.")
  public ResponseEntity<ApiResponse<MentoringPostResponse.Detail>> update(
      @PathVariable Long postId, @Valid @RequestBody MentoringPostRequest.Update request) {
    // 수정 검증은 DTO validation과 Service 비즈니스 검증으로 분리한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringPostService.update(postId, request)));
  }

  @DeleteMapping("/{postId}")
  @Operation(summary = "멘토링 공고 삭제", description = "멘토링 공고를 Soft Delete 처리합니다.")
  public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long postId) {
    // 삭제 응답은 data 없이 성공 공통 포맷만 반환한다.
    mentoringPostService.delete(postId);
    return ResponseEntity.ok(ApiResponse.ok());
  }
}

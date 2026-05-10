package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.CourseMaterialResponse;
import com.devpath.api.learning.service.CourseMaterialService;
import com.devpath.api.learning.service.CourseMaterialService.CourseMaterialDownloadTarget;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 학습 - 학습자료", description = "강의 레슨 학습자료 메타 조회 및 다운로드 API")
@RestController
@RequestMapping("/api/learning/lessons")
@RequiredArgsConstructor
public class CourseMaterialController {

  private final CourseMaterialService courseMaterialService;

  @Operation(summary = "학습자료 목록 조회", description = "선택한 레슨의 학습자료 메타 정보를 조회합니다.")
  @GetMapping("/{lessonId}/materials")
  public ResponseEntity<ApiResponse<List<CourseMaterialResponse>>> getMaterials(
      @PathVariable Long lessonId) {
    return ResponseEntity.ok(ApiResponse.ok(courseMaterialService.getMaterials(lessonId)));
  }

  @Operation(summary = "학습자료 다운로드", description = "선택한 학습자료 다운로드를 시작할 외부 파일 URL로 리다이렉트합니다.")
  @GetMapping("/{lessonId}/materials/{materialId}/download")
  public ResponseEntity<Void> downloadMaterial(
      @PathVariable Long lessonId, @PathVariable Long materialId) {
    CourseMaterialDownloadTarget material =
        courseMaterialService.getDownloadMaterialTarget(lessonId, materialId);
    String contentDisposition =
        ContentDisposition.attachment()
            .filename(material.originalFileName(), StandardCharsets.UTF_8)
            .build()
            .toString();

    return ResponseEntity.status(HttpStatus.FOUND)
        .location(URI.create(material.materialUrl()))
        .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
        .build();
  }
}

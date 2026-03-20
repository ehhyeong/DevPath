package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.CourseMaterialResponse;
import com.devpath.api.learning.service.CourseMaterialService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "강의 학습 - 학습자료", description = "강의 레슨 학습자료 메타 조회 API")
@RestController
@RequestMapping("/api/learning/lessons")
@RequiredArgsConstructor
public class CourseMaterialController {

    private final CourseMaterialService courseMaterialService;

    @Operation(summary = "학습자료 목록 조회", description = "특정 레슨에 첨부된 학습자료(슬라이드, 코드, 참고자료 등)의 메타 정보를 조회합니다.")
    @GetMapping("/{lessonId}/materials")
    public ResponseEntity<ApiResponse<List<CourseMaterialResponse>>> getMaterials(
            @PathVariable Long lessonId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(courseMaterialService.getMaterials(lessonId)));
    }
}

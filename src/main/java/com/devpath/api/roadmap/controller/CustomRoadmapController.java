package com.devpath.api.roadmap.controller;

import com.devpath.api.roadmap.dto.CustomRoadmapCopyDto;
import com.devpath.api.roadmap.service.CustomRoadmapCopyService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Custom Roadmap", description = "학습자 커스텀 로드맵 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/my-roadmaps")
public class CustomRoadmapController {

    private final CustomRoadmapCopyService customRoadmapCopyService;

    @Operation(summary = "오피셜 로드맵 딥카피", description = "오피셜 로드맵을 유저 전용 커스텀 로드맵으로 복제합니다. (JWT 적용 전 userId는 임시 입력)")
    @PostMapping("/copy")
    public ResponseEntity<ApiResponse<CustomRoadmapCopyDto.Response>> copy(@Valid @RequestBody CustomRoadmapCopyDto.Request request) {
        Long customRoadmapId = customRoadmapCopyService.copyToCustomRoadmap(request.getUserId(), request.getRoadmapId());
        return ResponseEntity.ok(ApiResponse.ok(CustomRoadmapCopyDto.Response.of(customRoadmapId)));
    }
}
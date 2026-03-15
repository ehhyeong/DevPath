package com.devpath.api.learner.controller;

import com.devpath.api.common.dto.ApiResponse;
import com.devpath.api.learner.dto.SkillCheckDto;
import com.devpath.api.learner.service.SkillCheckService;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
@Tag(name = "학습자 - 스킬 체크", description = "학습자의 보유 스킬 관리 및 로드맵 추천 API")
public class SkillCheckController {

    private final SkillCheckService skillCheckService;
    private final RoadmapRepository roadmapRepository;

    @PostMapping("/skills/check")
    @Operation(
            summary = "보유 스킬 등록",
            description = "사용자가 보유한 스킬을 일괄 등록합니다. 이미 등록된 스킬은 중복 등록되지 않습니다."
    )
    public ResponseEntity<ApiResponse<SkillCheckDto.RegisterSkillsResponse>> registerSkills(
            @RequestBody SkillCheckDto.RegisterSkillsRequest request
    ) {
        // TODO: SecurityContext에서 userId 추출
        Long userId = 1L;

        // 기존 보유 스킬 조회
        List<String> existingSkills = skillCheckService.getUserSkills(userId);

        // 새로운 스킬 등록
        List<String> registeredSkills = skillCheckService.registerUserSkills(userId, request.getTagNames());

        // 이미 보유한 스킬 필터링
        List<String> alreadyOwned = request.getTagNames().stream()
                .filter(existingSkills::contains)
                .collect(Collectors.toList());

        SkillCheckDto.RegisterSkillsResponse response = SkillCheckDto.RegisterSkillsResponse.builder()
                .registeredSkills(registeredSkills)
                .existingSkills(alreadyOwned)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/roadmaps/{roadmapId}/skill-suggestions")
    @Operation(
            summary = "로드맵 추천 스킬 조회",
            description = "특정 로드맵을 완료하기 위해 필요한 스킬 중 사용자가 아직 보유하지 않은 스킬을 추천합니다."
    )
    public ResponseEntity<ApiResponse<SkillCheckDto.SuggestedSkillsResponse>> getSuggestedSkills(
            @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId
    ) {
        // TODO: SecurityContext에서 userId 추출
        Long userId = 1L;

        // 로드맵 조회
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        // 사용자 보유 스킬 조회
        List<String> userSkills = skillCheckService.getUserSkills(userId);

        // 추천 스킬 조회
        List<String> suggestedSkills = skillCheckService.suggestSkillsForRoadmap(userId, roadmapId);

        // 전체 필수 스킬 수
        int totalRequiredSkills = userSkills.size() + suggestedSkills.size();

        // 스킬 커버리지 계산
        double coveragePercent = totalRequiredSkills > 0
                ? (double) userSkills.size() / totalRequiredSkills * 100
                : 0.0;

        SkillCheckDto.SuggestedSkillsResponse response = SkillCheckDto.SuggestedSkillsResponse.builder()
                .roadmapId(roadmapId)
                .roadmapTitle(roadmap.getTitle())
                .userSkills(userSkills)
                .suggestedSkills(suggestedSkills)
                .totalRequiredSkills(totalRequiredSkills)
                .skillCoveragePercent(Math.round(coveragePercent * 10) / 10.0)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/roadmaps/{roadmapId}/lock-status")
    @Operation(
            summary = "로드맵 노드 잠금 상태 조회",
            description = "로드맵의 모든 노드에 대한 잠금/해금 상태를 조회합니다."
    )
    public ResponseEntity<ApiResponse<SkillCheckDto.RoadmapLockStatusResponse>> getRoadmapLockStatus(
            @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId
    ) {
        // TODO: SecurityContext에서 userId 추출
        Long userId = 1L;

        // 로드맵 조회
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        // TODO: 실제 구현 시 CustomRoadmapNode에서 노드 목록 조회
        // 임시: 빈 목록 반환
        List<SkillCheckDto.NodeLockStatusResponse> nodeLockStatus = new ArrayList<>();

        SkillCheckDto.RoadmapLockStatusResponse response = SkillCheckDto.RoadmapLockStatusResponse.builder()
                .roadmapId(roadmapId)
                .roadmapTitle(roadmap.getTitle())
                .totalNodes(0)
                .unlockedNodes(0)
                .nodeLockStatus(nodeLockStatus)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

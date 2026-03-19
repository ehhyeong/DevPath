package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.NodeRecommendationDto;
import com.devpath.api.learner.service.NodeRecommendationService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.RecommendationStatus;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
@Tag(name = "학습자 노드 추천", description = "AI 기반 로드맵 노드 추천 관리 API")
public class NodeRecommendationController {

    private final NodeRecommendationService nodeRecommendationService;
    private final RoadmapRepository roadmapRepository;

    @PostMapping("/roadmaps/{roadmapId}/recommendations/init")
    @Operation(
            summary = "AI 추천 노드 생성",
            description = "진단 퀴즈 결과를 바탕으로 AI가 추천하는 보강/심화 노드를 생성합니다. 기존 PENDING 상태 추천은 만료 처리합니다."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.GenerateRecommendationsResponse>> generateRecommendations(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId
    ) {
        List<NodeRecommendation> recommendations =
                nodeRecommendationService.generateRecommendations(userId, roadmapId);

        NodeRecommendationDto.GenerateRecommendationsResponse response =
                NodeRecommendationDto.GenerateRecommendationsResponse.from(roadmapId, recommendations);

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/roadmaps/{roadmapId}/recommendations")
    @Operation(
            summary = "로드맵 추천 목록 조회",
            description = "특정 로드맵의 추천 노드 목록을 조회합니다. pendingOnly=true면 PENDING 상태 추천만 반환합니다."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.RoadmapRecommendationsResponse>> getRecommendations(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId,
            @Parameter(description = "PENDING 상태만 조회 여부") @RequestParam(defaultValue = "true") Boolean pendingOnly
    ) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        List<NodeRecommendation> recommendations = pendingOnly
                ? nodeRecommendationService.getPendingRecommendations(userId, roadmapId)
                : nodeRecommendationService.getRecommendations(userId, roadmapId);

        long pendingCount = recommendations.stream()
                .filter(r -> r.getStatus() == RecommendationStatus.PENDING)
                .count();
        long acceptedCount = recommendations.stream()
                .filter(r -> r.getStatus() == RecommendationStatus.ACCEPTED)
                .count();
        long rejectedCount = recommendations.stream()
                .filter(r -> r.getStatus() == RecommendationStatus.REJECTED)
                .count();

        NodeRecommendationDto.RoadmapRecommendationsResponse response =
                NodeRecommendationDto.RoadmapRecommendationsResponse.builder()
                        .roadmapId(roadmapId)
                        .roadmapTitle(roadmap.getTitle())
                        .totalRecommendations(recommendations.size())
                        .pendingCount((int) pendingCount)
                        .acceptedCount((int) acceptedCount)
                        .rejectedCount((int) rejectedCount)
                        .recommendations(
                                recommendations.stream()
                                        .map(NodeRecommendationDto.RecommendationResponse::from)
                                        .collect(Collectors.toList())
                        )
                        .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/recommendations/{recommendationId}/accept")
    @Operation(
            summary = "추천 수락",
            description = "AI가 추천한 노드를 수락합니다. 수락 시 해당 노드가 사용자의 커스텀 로드맵에 추가됩니다."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> acceptRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "추천 ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.acceptRecommendation(userId, recommendationId);

        NodeRecommendationDto.ProcessRecommendationResponse response =
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "추천 노드가 로드맵에 추가되었습니다."
                );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/recommendations/{recommendationId}/reject")
    @Operation(
            summary = "추천 거절",
            description = "AI가 추천한 노드를 거절합니다. 거절된 추천은 로드맵에 추가되지 않습니다."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> rejectRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "추천 ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.rejectRecommendation(userId, recommendationId);

        NodeRecommendationDto.ProcessRecommendationResponse response =
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "추천을 거절했습니다."
                );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/recommendations/{recommendationId}/expire")
    @Operation(
            summary = "추천 만료 처리",
            description = "추천을 수동으로 만료 처리합니다."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> expireRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "추천 ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.expireRecommendation(userId, recommendationId);

        NodeRecommendationDto.ProcessRecommendationResponse response =
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "추천을 만료 처리했습니다."
                );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}

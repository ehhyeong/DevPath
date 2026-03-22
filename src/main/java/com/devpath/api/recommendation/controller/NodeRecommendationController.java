package com.devpath.api.recommendation.controller;

import com.devpath.api.recommendation.dto.NodeRecommendationDto;
import com.devpath.api.recommendation.service.NodeRecommendationService;
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
            description = "학습 진행, 노트, OCR, TIL 신호와 보유 태그를 반영해 추천 후보를 생성합니다."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.GenerateRecommendationsResponse>> generateRecommendations(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "Roadmap ID") @PathVariable Long roadmapId
    ) {
        // 한글 주석: Swagger 요약 문구와 실제 추천 생성 엔드포인트 의미를 일치시킨다.
        List<NodeRecommendation> recommendations = nodeRecommendationService.generateRecommendations(userId, roadmapId);
        NodeRecommendationDto.GenerateRecommendationsResponse response =
                NodeRecommendationDto.GenerateRecommendationsResponse.from(roadmapId, recommendations);

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/roadmaps/{roadmapId}/recommendations")
    @Operation(
            summary = "보강 추천 목록 조회",
            description = "로드맵 기준 추천 목록을 조회합니다. pendingOnly=true 이면 PENDING 상태만 반환합니다."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.RoadmapRecommendationsResponse>> getRecommendations(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "Roadmap ID") @PathVariable Long roadmapId,
            @Parameter(description = "Pending 상태만 조회할지 여부") @RequestParam(defaultValue = "true") Boolean pendingOnly
    ) {
        nodeRecommendationService.processExpiredRecommendations(userId, roadmapId);

        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        List<NodeRecommendation> recommendations = pendingOnly
                ? nodeRecommendationService.getPendingRecommendations(userId, roadmapId)
                : nodeRecommendationService.getRecommendations(userId, roadmapId);

        long pendingCount = recommendations.stream()
                .filter(recommendation -> recommendation.getStatus() == RecommendationStatus.PENDING)
                .count();
        long acceptedCount = recommendations.stream()
                .filter(recommendation -> recommendation.getStatus() == RecommendationStatus.ACCEPTED)
                .count();
        long rejectedCount = recommendations.stream()
                .filter(recommendation -> recommendation.getStatus() == RecommendationStatus.REJECTED)
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
    @Operation(summary = "추천 수락", description = "추천 노드를 수락하고 커스텀 로드맵에 반영합니다.")
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> acceptRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "Recommendation ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.acceptRecommendation(userId, recommendationId);

        return ResponseEntity.ok(ApiResponse.ok(
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "Recommended node added to your roadmap."
                )
        ));
    }

    @PatchMapping("/recommendations/{recommendationId}/reject")
    @Operation(summary = "추천 거절", description = "추천 노드를 거절합니다.")
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> rejectRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "Recommendation ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.rejectRecommendation(userId, recommendationId);

        return ResponseEntity.ok(ApiResponse.ok(
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "Recommendation rejected."
                )
        ));
    }

    @PatchMapping("/recommendations/{recommendationId}/expire")
    @Operation(summary = "추천 만료 처리", description = "추천 노드를 수동으로 만료 처리합니다.")
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> expireRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "Recommendation ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.expireRecommendation(userId, recommendationId);

        return ResponseEntity.ok(ApiResponse.ok(
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "Recommendation expired."
                )
        ));
    }
}

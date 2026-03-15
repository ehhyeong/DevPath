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
@Tag(name = "?숈뒿??- ?몃뱶 異붿쿇", description = "AI 湲곕컲 濡쒕뱶留??몃뱶 異붿쿇 愿由?API")
public class NodeRecommendationController {

    private final NodeRecommendationService nodeRecommendationService;
    private final RoadmapRepository roadmapRepository;

    @PostMapping("/roadmaps/{roadmapId}/recommendations/init")
    @Operation(
            summary = "AI 異붿쿇 ?몃뱶 ?앹꽦",
            description = "吏꾨떒 ?댁쫰 寃곌낵瑜?諛뷀깢?쇰줈 AI媛 異붿쿇?섎뒗 蹂닿컯/?ы솕 ?몃뱶瑜??앹꽦?⑸땲?? 湲곗〈 PENDING ?곹깭 異붿쿇? 留뚮즺 泥섎━?⑸땲??"
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.GenerateRecommendationsResponse>> generateRecommendations(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "濡쒕뱶留?ID") @PathVariable Long roadmapId
    ) {
        List<NodeRecommendation> recommendations =
                nodeRecommendationService.generateRecommendations(userId, roadmapId);

        NodeRecommendationDto.GenerateRecommendationsResponse response =
                NodeRecommendationDto.GenerateRecommendationsResponse.from(roadmapId, recommendations);

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/roadmaps/{roadmapId}/recommendations")
    @Operation(
            summary = "濡쒕뱶留?異붿쿇 紐⑸줉 議고쉶",
            description = "?뱀젙 濡쒕뱶留듭쓽 紐⑤뱺 異붿쿇 ?몃뱶瑜?議고쉶?⑸땲?? PENDING ?곹깭??異붿쿇留??꾪꽣留곹븯嫄곕굹 ?꾩껜 異붿쿇??議고쉶?????덉뒿?덈떎."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.RoadmapRecommendationsResponse>> getRecommendations(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "濡쒕뱶留?ID") @PathVariable Long roadmapId,
            @Parameter(description = "PENDING ?곹깭留?議고쉶 ?щ?") @RequestParam(defaultValue = "true") Boolean pendingOnly
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
            summary = "異붿쿇 ?섎씫",
            description = "AI媛 異붿쿇???몃뱶瑜??섎씫?⑸땲?? ?섎씫 ???대떦 ?몃뱶媛 ?ъ슜?먯쓽 而ㅼ뒪? 濡쒕뱶留듭뿉 異붽??⑸땲??"
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> acceptRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "異붿쿇 ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.acceptRecommendation(userId, recommendationId);

        NodeRecommendationDto.ProcessRecommendationResponse response =
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "異붿쿇 ?몃뱶媛 濡쒕뱶留듭뿉 異붽??섏뿀?듬땲??"
                );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/recommendations/{recommendationId}/reject")
    @Operation(
            summary = "異붿쿇 嫄곗젅",
            description = "AI媛 異붿쿇???몃뱶瑜?嫄곗젅?⑸땲?? 嫄곗젅??異붿쿇? 濡쒕뱶留듭뿉 異붽??섏? ?딆뒿?덈떎."
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> rejectRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "異붿쿇 ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.rejectRecommendation(userId, recommendationId);

        NodeRecommendationDto.ProcessRecommendationResponse response =
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "異붿쿇??嫄곗젅?덉뒿?덈떎."
                );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/recommendations/{recommendationId}/expire")
    @Operation(
            summary = "異붿쿇 留뚮즺 泥섎━",
            description = "異붿쿇???섎룞?쇰줈 留뚮즺 泥섎━?⑸땲??"
    )
    public ResponseEntity<ApiResponse<NodeRecommendationDto.ProcessRecommendationResponse>> expireRecommendation(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "異붿쿇 ID") @PathVariable Long recommendationId
    ) {
        NodeRecommendation recommendation = nodeRecommendationService.expireRecommendation(userId, recommendationId);

        NodeRecommendationDto.ProcessRecommendationResponse response =
                NodeRecommendationDto.ProcessRecommendationResponse.from(
                        recommendation,
                        "異붿쿇??留뚮즺?섏뿀?듬땲??"
                );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}

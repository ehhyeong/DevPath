package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "보강 학습 노드 추천 응답 DTO")
public class SupplementRecommendationResponse {

    @Schema(description = "보강 추천 ID", example = "1")
    private Long recommendationId;

    @Schema(description = "로드맵 노드 ID", example = "100")
    private Long nodeId;

    @Schema(description = "추천 노드 제목", example = "Spring Security")
    private String nodeTitle;

    @Schema(description = "추천 사유", example = "부족한 선수 지식을 먼저 보강하는 편이 안전합니다.")
    private String reason;

    @Schema(description = "추천 우선순위", example = "1")
    private Integer priority;

    @Schema(description = "현재 보유 태그 커버리지", example = "66.67")
    private Double coveragePercent;

    // 한글 주석: 추천 후보 산정에 사용한 누락 태그 수를 응답으로 노출한다.
    @Schema(description = "누락된 필수 태그 수", example = "1")
    private Integer missingTagCount;

    @Schema(description = "추천 상태", example = "PENDING")
    private RecommendationStatus status;

    @Schema(description = "추천 생성 시각", example = "2026-03-23T12:30:00")
    private LocalDateTime createdAt;

    public static SupplementRecommendationResponse from(SupplementRecommendation rec) {
        return SupplementRecommendationResponse.builder()
                .recommendationId(rec.getId())
                .nodeId(rec.getRoadmapNode().getNodeId())
                .nodeTitle(rec.getRoadmapNode().getTitle())
                .reason(rec.getReason())
                .priority(rec.getPriority())
                .coveragePercent(rec.getCoveragePercent())
                .missingTagCount(rec.getMissingTagCount())
                .status(rec.getStatus())
                .createdAt(rec.getCreatedAt())
                .build();
    }
}

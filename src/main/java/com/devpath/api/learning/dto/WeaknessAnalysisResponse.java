package com.devpath.api.learning.dto;

import com.devpath.domain.roadmap.entity.DiagnosisResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "취약점 분석 응답 DTO")
public class WeaknessAnalysisResponse {

    @Schema(description = "진단 결과 ID", example = "1")
    private Long resultId;

    @Schema(description = "로드맵 ID", example = "10")
    private Long roadmapId;

    @Schema(description = "획득 점수", example = "12")
    private Integer score;

    @Schema(description = "만점", example = "20")
    private Integer maxScore;

    @Schema(description = "점수 비율", example = "60.0")
    private Double scorePercentage;

    // 한글 주석: comma-separated 약점 태그 문자열을 Swagger에 보이는 배열 형태로 정규화한다.
    @Schema(description = "약점 태그 목록")
    private List<String> weakTags;

    @Schema(description = "추천 보강 노드 ID 목록")
    private List<Long> recommendedNodeIds;

    @Schema(description = "분석 시각", example = "2026-03-23T12:30:00")
    private LocalDateTime analyzedAt;

    public static WeaknessAnalysisResponse from(DiagnosisResult result) {
        List<String> weakTags = parseWeakTags(result.getWeakAreas());
        List<Long> recommendedNodeIds = parseNodeIds(result.getRecommendedNodes());

        return WeaknessAnalysisResponse.builder()
                .resultId(result.getResultId())
                .roadmapId(result.getRoadmap().getRoadmapId())
                .score(result.getScore())
                .maxScore(result.getMaxScore())
                .scorePercentage(result.getScorePercentage())
                .weakTags(weakTags)
                .recommendedNodeIds(recommendedNodeIds)
                .analyzedAt(result.getCreatedAt())
                .build();
    }

    private static List<String> parseWeakTags(String weakAreas) {
        if (weakAreas == null || weakAreas.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(weakAreas.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toList());
    }

    private static List<Long> parseNodeIds(String recommendedNodes) {
        if (recommendedNodes == null || recommendedNodes.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(recommendedNodes.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }
}

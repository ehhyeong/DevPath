package com.devpath.api.learner.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

public class SkillCheckDto {

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "스킬 등록 요청")
    public static class RegisterSkillsRequest {
        @Schema(description = "등록할 스킬 태그 목록", example = "[\"Java\", \"Spring Boot\", \"MySQL\"]")
        private List<String> tagNames;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "스킬 등록 응답")
    public static class RegisterSkillsResponse {
        @Schema(description = "등록된 스킬 목록")
        private List<String> registeredSkills;

        @Schema(description = "이미 보유 중인 스킬 목록")
        private List<String> existingSkills;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "로드맵 추천 스킬 응답")
    public static class SuggestedSkillsResponse {
        @Schema(description = "로드맵 ID")
        private Long roadmapId;

        @Schema(description = "로드맵 이름")
        private String roadmapTitle;

        @Schema(description = "사용자가 이미 보유한 스킬")
        private List<String> userSkills;

        @Schema(description = "추천 스킬 (아직 보유하지 않은 스킬)")
        private List<String> suggestedSkills;

        @Schema(description = "전체 필수 스킬 수")
        private Integer totalRequiredSkills;

        @Schema(description = "보유한 스킬 비율 (%)", example = "65.5")
        private Double skillCoveragePercent;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "노드 잠금 상태 응답")
    public static class NodeLockStatusResponse {
        @Schema(description = "노드 ID")
        private Long nodeId;

        @Schema(description = "노드 이름")
        private String nodeTitle;

        @Schema(description = "잠금 여부 (true: 잠김, false: 해금)")
        private Boolean isLocked;

        @Schema(description = "잠금 사유", example = "선행 노드 미완료")
        private String lockReason;

        @Schema(description = "필수 선행 노드 ID 목록")
        private List<Long> requiredNodeIds;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "로드맵 전체 노드 잠금 상태 응답")
    public static class RoadmapLockStatusResponse {
        @Schema(description = "로드맵 ID")
        private Long roadmapId;

        @Schema(description = "로드맵 이름")
        private String roadmapTitle;

        @Schema(description = "전체 노드 수")
        private Integer totalNodes;

        @Schema(description = "해금된 노드 수")
        private Integer unlockedNodes;

        @Schema(description = "각 노드의 잠금 상태 목록")
        private List<NodeLockStatusResponse> nodeLockStatus;
    }
}

package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.clearance.ClearanceReasonType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class NodeClearanceResponse {

    @Getter
    @Builder
    @Schema(description = "Node clearance detail response")
    public static class Detail {

        @Schema(description = "Roadmap node ID", example = "10")
        private Long nodeId;

        @Schema(description = "Roadmap node title", example = "Spring Security JWT Auth")
        private String nodeTitle;

        @Schema(description = "Clearance status", example = "CLEARED")
        private String clearanceStatus;

        @Schema(description = "Lesson completion rate", example = "100.00")
        private BigDecimal lessonCompletionRate;

        @Schema(description = "Required tags satisfied", example = "true")
        private Boolean requiredTagsSatisfied;

        @Schema(description = "Missing tag count", example = "0")
        private Integer missingTagCount;

        @Schema(description = "Lesson completed", example = "true")
        private Boolean lessonCompleted;

        @Schema(description = "Quiz passed", example = "true")
        private Boolean quizPassed;

        @Schema(description = "Assignment passed", example = "true")
        private Boolean assignmentPassed;

        @Schema(description = "Proof eligible", example = "true")
        private Boolean proofEligible;

        @Schema(description = "Last calculated at", example = "2026-03-27T14:30:00")
        private LocalDateTime lastCalculatedAt;

        @Schema(description = "Cleared at", example = "2026-03-27T14:30:10")
        private LocalDateTime clearedAt;
    }

    @Getter
    @Builder
    @Schema(description = "Node clearance reason response")
    public static class ReasonDetail {

        @Schema(description = "Reason type", example = "LESSON_COMPLETION")
        private ClearanceReasonType reasonType;

        @Schema(description = "Satisfied", example = "true")
        private Boolean satisfied;

        @Schema(description = "Detail message", example = "Lesson completion rate: 100.00%")
        private String detailMessage;
    }

    @Getter
    @Builder
    @Schema(description = "Proof check response")
    public static class ProofCheck {

        @Schema(description = "Roadmap node ID", example = "10")
        private Long nodeId;

        @Schema(description = "Proof eligible", example = "true")
        private Boolean proofEligible;

        @Schema(description = "Reason list")
        private List<ReasonDetail> reasons;
    }
}

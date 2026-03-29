package com.devpath.api.admin.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

// Admin learning metric response DTOs.
public class AdminLearningMetricResponse {

    // Response DTO for a single learning metric.
    @Getter
    @Builder
    @Schema(description = "Learning metric response")
    public static class Detail {

        @Schema(description = "Metric key", example = "clearanceRate")
        private String metricKey;

        @Schema(description = "Metric name", example = "Node clearance rate")
        private String metricName;

        @Schema(description = "Metric value", example = "87.5")
        private Double metricValue;

        @Schema(description = "Metric description", example = "Percentage of node clearance results that are CLEARED.")
        private String description;

        @Schema(description = "Measured at", example = "2026-03-29T12:20:00")
        private LocalDateTime measuredAt;
    }

    // Response DTO for automation monitor data.
    @Getter
    @Builder
    @Schema(description = "Automation monitor response")
    public static class AutomationMonitorDetail {

        @Schema(description = "Monitor key", example = "PROOF_CARD_AUTO_ISSUE")
        private String monitorKey;

        @Schema(description = "Status", example = "HEALTHY")
        private String status;

        @Schema(description = "Snapshot value", example = "1.0")
        private Double snapshotValue;

        @Schema(description = "Snapshot message", example = "The auto issue rule is enabled.")
        private String snapshotMessage;

        @Schema(description = "Measured at", example = "2026-03-29T12:20:00")
        private LocalDateTime measuredAt;
    }

    // Response DTO for annual report data.
    @Getter
    @Builder
    @Schema(description = "Annual report response")
    public static class AnnualReportDetail {

        @Schema(description = "Year", example = "2026")
        private Integer year;

        @Schema(description = "Node clearance rate", example = "87.5")
        private Double clearanceRate;

        @Schema(description = "Roadmap completion rate", example = "42.8")
        private Double roadmapCompletionRate;

        @Schema(description = "Average learning duration in seconds", example = "1380.0")
        private Double averageLearningDurationSeconds;

        @Schema(description = "Quiz quality score", example = "79.4")
        private Double quizQualityScore;

        @Schema(description = "Issued proof card count", example = "52")
        private Long issuedProofCardCount;

        @Schema(description = "Recommendation change count", example = "33")
        private Long recommendationChangeCount;

        @Schema(description = "Automation monitors")
        private List<AutomationMonitorDetail> automationMonitors;
    }
}

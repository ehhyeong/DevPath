package com.devpath.api.admin.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

// Admin learning rule response DTOs.
public class AdminLearningRuleResponse {

    // Response DTO for a learning automation rule.
    @Getter
    @Builder
    @Schema(description = "Learning automation rule response")
    public static class Detail {

        @Schema(description = "Rule ID", example = "1")
        private Long ruleId;

        @Schema(description = "Rule key", example = "PROOF_CARD_AUTO_ISSUE")
        private String ruleKey;

        @Schema(description = "Rule name", example = "Proof Card auto issue")
        private String ruleName;

        @Schema(description = "Rule description", example = "Automatically issues a proof card when a node is cleared.")
        private String description;

        @Schema(description = "Rule value", example = "true")
        private String ruleValue;

        @Schema(description = "Priority", example = "100")
        private Integer priority;

        @Schema(description = "Rule status", example = "ENABLED")
        private String status;

        @Schema(description = "Created at", example = "2026-03-29T12:00:00")
        private LocalDateTime createdAt;

        @Schema(description = "Updated at", example = "2026-03-29T12:10:00")
        private LocalDateTime updatedAt;
    }
}

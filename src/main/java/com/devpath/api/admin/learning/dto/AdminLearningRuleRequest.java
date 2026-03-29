package com.devpath.api.admin.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Admin learning rule request DTOs.
public class AdminLearningRuleRequest {

    // Request DTO for creating or updating a learning automation rule.
    @Getter
    @NoArgsConstructor
    @Schema(description = "Learning automation rule create or update request")
    public static class Upsert {

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
    }
}

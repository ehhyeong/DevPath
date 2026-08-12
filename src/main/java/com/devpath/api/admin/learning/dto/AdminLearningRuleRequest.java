package com.devpath.api.admin.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
    @NotBlank
    @Size(max = 100)
    @Pattern(regexp = "[A-Z][A-Z0-9_]*")
    private String ruleKey;

    @Schema(description = "Rule name", example = "Proof Card auto issue")
    @NotBlank
    @Size(max = 150)
    private String ruleName;

    @Schema(
        description = "Rule description",
        example = "Automatically issues a proof card when a node is cleared.")
    @Size(max = 2000)
    private String description;

    @Schema(description = "Rule value", example = "true")
    @NotBlank
    @Size(max = 500)
    private String ruleValue;

    @Schema(description = "Priority", example = "100")
    @NotNull
    @Min(0)
    @Max(1000)
    private Integer priority;
  }
}

package com.devpath.api.admin.dto.governance;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NodeCompletionRuleRequest {

  @NotBlank private String completionRuleDescription;

  private Integer requiredProgressRate;
}

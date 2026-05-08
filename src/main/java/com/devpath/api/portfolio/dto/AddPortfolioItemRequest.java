package com.devpath.api.portfolio.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AddPortfolioItemRequest {

  @NotNull private Long referenceId;
}

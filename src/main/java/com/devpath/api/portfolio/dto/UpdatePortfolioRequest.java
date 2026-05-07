package com.devpath.api.portfolio.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdatePortfolioRequest {

    @NotBlank
    private String title;

    private String bio;

    private boolean isPublic;
}
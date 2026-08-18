package com.devpath.api.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ReportCreateRequest(
    @NotNull ReportTargetType targetType,
    @NotNull @Positive Long targetId,
    @NotBlank @Size(max = 2000) String reason) {}

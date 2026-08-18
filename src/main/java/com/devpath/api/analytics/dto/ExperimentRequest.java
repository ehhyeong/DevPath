package com.devpath.api.analytics.dto;

import com.devpath.domain.analytics.ExperimentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ExperimentRequest {

  private ExperimentRequest() {}

  public record Create(
      @NotBlank @Size(max = 100) @Pattern(regexp = "[A-Za-z0-9_-]+") String experimentId,
      @NotBlank @Size(max = 200) String experimentName,
      @NotBlank @Size(max = 2000) String hypothesis) {}

  public record ChangeStatus(@NotNull ExperimentStatus status) {}

  public record SaveResult(@NotBlank @Size(max = 10000) String metricsJson) {}
}

package com.devpath.api.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class WorkspaceApiResponseDraft {
  private WorkspaceApiResponseDraft() {}

  public record Request(
      @NotBlank @Pattern(regexp = "GET|POST|PUT|PATCH|DELETE") String method,
      @NotBlank @Size(max = 500) @Pattern(regexp = "/[^\\s]*") String path,
      @NotBlank @Size(max = 4000) String description,
      @Size(max = 100) String group,
      @Size(max = 12000) String requestExample) {}

  public record Response(int status, String body) {}
}

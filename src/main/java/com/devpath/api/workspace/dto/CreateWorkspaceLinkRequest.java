package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateWorkspaceLinkRequest {

  @NotBlank
  @Schema(description = "Link title", example = "ERD Cloud")
  private String title;

  @NotBlank
  @Schema(description = "External URL", example = "https://www.erdcloud.com/")
  private String url;

  @Schema(description = "Parent folder ID")
  private Long parentId;
}

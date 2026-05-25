package com.devpath.api.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateSquadHeaderNotificationRequest {

  @NotBlank(message = "pageKey is required.")
  @Size(max = 40, message = "pageKey must be 40 characters or less.")
  private String pageKey;

  @NotBlank(message = "message is required.")
  @Size(max = 500, message = "message must be 500 characters or less.")
  private String message;

  @Size(max = 120, message = "targetPath must be 120 characters or less.")
  private String targetPath;
}

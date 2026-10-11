package com.devpath.api.workspace.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WorkspaceInviteRequest(@NotBlank @Email @Size(max = 255) String email) {}

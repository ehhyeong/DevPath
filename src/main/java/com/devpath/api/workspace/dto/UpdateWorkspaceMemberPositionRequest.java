package com.devpath.api.workspace.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UpdateWorkspaceMemberPositionRequest(
    @NotNull @Pattern(regexp = "|FE|BE|FS|DES|OPS|PM") String position) {}

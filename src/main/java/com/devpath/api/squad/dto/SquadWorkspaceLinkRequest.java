package com.devpath.api.squad.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SquadWorkspaceLinkRequest {

  @NotNull(message = "workspaceId is required.")
  private Long workspaceId;
}

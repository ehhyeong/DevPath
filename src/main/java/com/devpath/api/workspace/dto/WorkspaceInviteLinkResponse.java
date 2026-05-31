package com.devpath.api.workspace.dto;

import java.time.LocalDateTime;

public record WorkspaceInviteLinkResponse(Long workspaceId, String token, LocalDateTime expiresAt) {}

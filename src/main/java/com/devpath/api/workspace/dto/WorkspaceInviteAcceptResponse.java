package com.devpath.api.workspace.dto;

public record WorkspaceInviteAcceptResponse(
    Long workspaceId, String dashboardUrl, boolean alreadyMember) {}

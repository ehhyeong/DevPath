package com.devpath.api.admin.dto.moderation;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ModerationStatsResponse {

    private long totalReports;
    private long resolvedReports;
    private long pendingReports;
    private long blindedContents;
    private long suspendedUsers;
}
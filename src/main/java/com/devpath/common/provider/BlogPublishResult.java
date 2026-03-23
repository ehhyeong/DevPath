package com.devpath.common.provider;

import java.time.LocalDateTime;

public record BlogPublishResult(
        String platform,
        boolean published,
        String externalPostId,
        String publishedUrl,
        boolean draft,
        LocalDateTime publishedAt
) {
}

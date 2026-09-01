package com.devpath.api.learning.provider;

import java.time.LocalDateTime;

public record BlogPublishResult(
    String platform,
    boolean published,
    String externalPostId,
    String publishedUrl,
    boolean draft,
    LocalDateTime publishedAt) {}

package com.devpath.api.notice.dto;

import com.devpath.domain.notice.entity.Notice;
import java.time.LocalDateTime;

public record PlatformNoticeResponse(
    Long id,
    String title,
    String content,
    Boolean pinned,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {

  public static PlatformNoticeResponse from(Notice notice) {
    return new PlatformNoticeResponse(
        notice.getId(),
        notice.getTitle(),
        notice.getContent(),
        notice.getIsPinned(),
        notice.getCreatedAt(),
        notice.getUpdatedAt());
  }
}

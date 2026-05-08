package com.devpath.api.admin.dto.notice;

import com.devpath.api.notice.entity.Notice;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NoticeResponse {

  private Long id;
  private Long authorId;
  private String title;
  private String content;
  private Boolean isPinned;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static NoticeResponse from(Notice notice) {
    return NoticeResponse.builder()
        .id(notice.getId())
        .authorId(notice.getAuthorId())
        .title(notice.getTitle())
        .content(notice.getContent())
        .isPinned(notice.getIsPinned())
        .createdAt(notice.getCreatedAt())
        .updatedAt(notice.getUpdatedAt())
        .build();
  }
}

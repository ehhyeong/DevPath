package com.devpath.api.admin.dto.governance;

import com.devpath.domain.user.entity.Tag;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TagResponse {

  private Long id;
  private String name;
  private String description;
  private LocalDateTime createdAt;

  public static TagResponse from(Tag tag) {
    return TagResponse.builder()
        .id(tag.getTagId())
        .name(tag.getName())
        .description(tag.getCategory())
        .createdAt(null)
        .build();
  }
}

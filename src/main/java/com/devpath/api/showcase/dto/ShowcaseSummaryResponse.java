package com.devpath.api.showcase.dto;

import com.devpath.domain.showcase.entity.Showcase;
import com.devpath.domain.showcase.entity.ShowcaseCategory;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ShowcaseSummaryResponse {

  private Long showcaseId;
  private Long userId;
  private String title;
  private String thumbnailUrl;
  private ShowcaseCategory category;
  private boolean isPublic;
  private long viewCount;
  private long likeCount;
  private LocalDateTime createdAt;

  public static ShowcaseSummaryResponse of(Showcase showcase, long likeCount) {
    return ShowcaseSummaryResponse.builder()
        .showcaseId(showcase.getId())
        .userId(showcase.getUserId())
        .title(showcase.getTitle())
        .thumbnailUrl(showcase.getThumbnailUrl())
        .category(showcase.getCategory())
        .isPublic(showcase.isPublic())
        .viewCount(showcase.getViewCount())
        .likeCount(likeCount)
        .createdAt(showcase.getCreatedAt())
        .build();
  }
}

package com.devpath.api.showcase.dto;

import com.devpath.domain.showcase.entity.Showcase;
import com.devpath.domain.showcase.entity.ShowcaseCategory;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ShowcaseSummaryResponse {

  private Long showcaseId;
  private Long userId;
  private String authorName;
  private String authorProfileImage;
  private String title;
  private String description;
  private String thumbnailUrl;
  private String techStack;
  private ShowcaseCategory category;
  private boolean isPublic;
  private long viewCount;
  private long likeCount;
  private LocalDateTime createdAt;

  public static ShowcaseSummaryResponse of(Showcase showcase, long likeCount) {
    return of(showcase, likeCount, null, null);
  }

  public static ShowcaseSummaryResponse of(
      Showcase showcase, long likeCount, String authorProfileImage, String authorName) {
    return ShowcaseSummaryResponse.builder()
        .showcaseId(showcase.getId())
        .userId(showcase.getUserId())
        .authorName(authorName)
        .authorProfileImage(authorProfileImage)
        .title(showcase.getTitle())
        .description(showcase.getDescription())
        .thumbnailUrl(showcase.getThumbnailUrl())
        .techStack(showcase.getTechStack())
        .category(showcase.getCategory())
        .isPublic(showcase.isPublic())
        .viewCount(showcase.getViewCount())
        .likeCount(likeCount)
        .createdAt(showcase.getCreatedAt())
        .build();
  }
}

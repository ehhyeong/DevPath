package com.devpath.api.showcase.dto;

import com.devpath.domain.showcase.entity.Showcase;
import com.devpath.domain.showcase.entity.ShowcaseCategory;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ShowcaseResponse {

  private Long showcaseId;
  private Long userId;
  private String authorProfileImage;
  private String title;
  private String description;
  private String thumbnailUrl;
  private ShowcaseCategory category;
  private boolean isPublic;
  private long viewCount;
  private long likeCount;
  private List<ShowcaseLinkResponse> links;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static ShowcaseResponse of(
      Showcase showcase, long likeCount, List<ShowcaseLinkResponse> links) {
    return of(showcase, likeCount, links, null);
  }

  public static ShowcaseResponse of(
      Showcase showcase,
      long likeCount,
      List<ShowcaseLinkResponse> links,
      String authorProfileImage) {
    return ShowcaseResponse.builder()
        .showcaseId(showcase.getId())
        .userId(showcase.getUserId())
        .authorProfileImage(authorProfileImage)
        .title(showcase.getTitle())
        .description(showcase.getDescription())
        .thumbnailUrl(showcase.getThumbnailUrl())
        .category(showcase.getCategory())
        .isPublic(showcase.isPublic())
        .viewCount(showcase.getViewCount())
        .likeCount(likeCount)
        .links(links)
        .createdAt(showcase.getCreatedAt())
        .updatedAt(showcase.getUpdatedAt())
        .build();
  }
}

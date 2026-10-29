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
  private List<ShowcaseLinkResponse> links;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static ShowcaseResponse of(
      Showcase showcase, long likeCount, List<ShowcaseLinkResponse> links) {
    return of(showcase, likeCount, links, null, null);
  }

  public static ShowcaseResponse of(
      Showcase showcase,
      long likeCount,
      List<ShowcaseLinkResponse> links,
      String authorProfileImage,
      String authorName) {
    return ShowcaseResponse.builder()
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
        .links(links)
        .createdAt(showcase.getCreatedAt())
        .updatedAt(showcase.getUpdatedAt())
        .build();
  }
}

package com.devpath.api.showcase.dto;

import com.devpath.domain.showcase.entity.ShowcaseLink;
import com.devpath.domain.showcase.entity.ShowcaseLinkType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ShowcaseLinkResponse {

  private Long linkId;
  private ShowcaseLinkType linkType;
  private String url;

  public static ShowcaseLinkResponse from(ShowcaseLink link) {
    return ShowcaseLinkResponse.builder()
        .linkId(link.getId())
        .linkType(link.getLinkType())
        .url(link.getUrl())
        .build();
  }
}

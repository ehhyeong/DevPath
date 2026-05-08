package com.devpath.api.showcase.dto;

import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateShowcaseLinksRequest {

  private List<LinkItem> links;

  @Getter
  @NoArgsConstructor
  public static class LinkItem {
    private String linkType;
    private String url;
  }
}

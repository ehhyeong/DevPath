package com.devpath.api.roadmap.dto;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

// 로드맵 허브 화면에서 사용하는 공개 카탈로그 응답 구조다.
@Getter
@Builder
public class RoadmapHubCatalogResponse {

  @Builder.Default private List<SectionItem> sections = List.of();

  @Getter
  @Builder
  public static class SectionItem {

    private String sectionKey;
    private String title;
    private String description;
    private String layoutType;
    private Integer sortOrder;
    private Boolean active;

    @Builder.Default private List<Item> items = List.of();
  }

  @Getter
  @Builder
  public static class Item {

    private String title;
    private String subtitle;
    private String iconClass;
    private String iconColor;
    private Integer sortOrder;
    private Boolean active;
    private Boolean featured;
    private Long linkedRoadmapId;
    private String linkedRoadmapTitle;
  }
}

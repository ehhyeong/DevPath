package com.devpath.api.admin.dto.roadmaphub;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Getter;

// 관리자 허브 편집기의 전체 저장 요청 구조다.
@Getter
public class RoadmapHubCatalogUpdateRequest {

  @Valid @NotEmpty private List<SectionRequest> sections;

  @Getter
  public static class SectionRequest {

    private String sectionKey;
    private String title;
    private String description;
    private String layoutType;
    private Integer sortOrder;
    private Boolean active;

    @Valid private List<ItemRequest> items;
  }

  @Getter
  public static class ItemRequest {

    private String title;
    private String subtitle;
    private String iconClass;
    private String iconColor;
    private Integer sortOrder;
    private Boolean active;
    private Boolean featured;
    private Long linkedRoadmapId;
  }
}

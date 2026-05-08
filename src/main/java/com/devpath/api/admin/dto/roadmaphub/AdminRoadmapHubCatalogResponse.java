package com.devpath.api.admin.dto.roadmaphub;

import com.devpath.api.roadmap.dto.RoadmapHubCatalogResponse;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

// 관리자 허브 편집기에서 섹션 구성과 연결 가능한 공식 로드맵 옵션을 함께 내려준다.
@Getter
@Builder
public class AdminRoadmapHubCatalogResponse {

  @Builder.Default private List<RoadmapHubCatalogResponse.SectionItem> sections = List.of();

  @Builder.Default private List<OfficialRoadmapOption> officialRoadmaps = List.of();

  @Getter
  @Builder
  public static class OfficialRoadmapOption {

    private Long roadmapId;
    private String title;
  }
}

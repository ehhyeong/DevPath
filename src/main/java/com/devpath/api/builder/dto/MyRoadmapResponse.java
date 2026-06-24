package com.devpath.api.builder.dto;

import com.devpath.domain.builder.entity.BuilderModule;
import com.devpath.domain.builder.entity.MyRoadmap;
import com.devpath.domain.builder.entity.MyRoadmapModule;
import com.devpath.domain.roadmap.entity.BranchKind;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class MyRoadmapResponse {

  private Long myRoadmapId;
  private Long customRoadmapId;
  private String title;
  private LocalDateTime createdAt;
  private List<MyRoadmapModuleDto> modules;

  public static MyRoadmapResponse from(MyRoadmap myRoadmap, Long customRoadmapId) {
    return MyRoadmapResponse.builder()
        .myRoadmapId(myRoadmap.getMyRoadmapId())
        .customRoadmapId(customRoadmapId)
        .title(myRoadmap.getTitle())
        .createdAt(myRoadmap.getCreatedAt())
        .modules(myRoadmap.getModules().stream().map(MyRoadmapModuleDto::from).toList())
        .build();
  }

  public static MyRoadmapResponse from(
      MyRoadmap myRoadmap, Long customRoadmapId, List<CustomRoadmapNode> nodes) {
    return MyRoadmapResponse.builder()
        .myRoadmapId(myRoadmap.getMyRoadmapId())
        .customRoadmapId(customRoadmapId)
        .title(myRoadmap.getTitle())
        .createdAt(myRoadmap.getCreatedAt())
        .modules(nodes.stream().map(MyRoadmapModuleDto::from).toList())
        .build();
  }

  public static MyRoadmapResponse from(MyRoadmap myRoadmap) {
    return from(myRoadmap, null);
  }

  @Getter
  @Builder
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  public static class MyRoadmapModuleDto {

    private String source;
    private Long builderModuleId;
    private Long originalNodeId;
    private String moduleId;
    private String category;
    private String title;
    private String icon;
    private String color;
    private String bgColor;
    private List<String> topics;
    private int sortOrder;
    private Integer branchGroup;

    public static MyRoadmapModuleDto from(MyRoadmapModule m) {
      BuilderModule bm = m.getBuilderModule();
      return MyRoadmapModuleDto.builder()
          .source("BUILDER_MODULE")
          .builderModuleId(bm.getId())
          .originalNodeId(null)
          .moduleId(bm.getModuleId())
          .category(bm.getCategory())
          .title(bm.getTitle())
          .icon(bm.getIcon())
          .color(bm.getColor())
          .bgColor(bm.getBgColor())
          .topics(bm.getTopics())
          .sortOrder(m.getSortOrder())
          .branchGroup(m.getBranchGroup())
          .build();
    }

    public static MyRoadmapModuleDto from(CustomRoadmapNode n) {
      if (n.getBuilderModule() != null) {
        BuilderModule bm = n.getBuilderModule();
        return MyRoadmapModuleDto.builder()
            .source("BUILDER_MODULE")
            .builderModuleId(bm.getId())
            .originalNodeId(null)
            .moduleId(bm.getModuleId())
            .category(bm.getCategory())
            .title(bm.getTitle())
            .icon(bm.getIcon())
            .color(bm.getColor())
            .bgColor(bm.getBgColor())
            .topics(bm.getTopics())
            .sortOrder(n.getCustomSortOrder() != null ? n.getCustomSortOrder() : 0)
            .branchGroup(resolveBranchGroup(n, n.getBuilderBranchGroup()))
            .build();
      }
      RoadmapNode rn = n.getOriginalNode();
      return MyRoadmapModuleDto.builder()
          .source("OFFICIAL_NODE")
          .builderModuleId(null)
          .originalNodeId(rn.getNodeId())
          .moduleId("official-" + rn.getNodeId())
          .category("공식 로드맵")
          .title(rn.getTitle())
          .icon("fas fa-book-open")
          .color("text-[#00C471]")
          .bgColor("bg-green-50")
          .topics(splitSubTopics(rn.getSubTopics()))
          .sortOrder(n.getCustomSortOrder() != null ? n.getCustomSortOrder() : 0)
          .branchGroup(resolveBranchGroup(n, rn.getBranchGroup()))
          .build();
    }

    // 분기 소속: 레인 모델은 구조분기(BRANCH)의 laneKey, 레거시는 옛 필드 폴백.
    private static Integer resolveBranchGroup(CustomRoadmapNode n, Integer legacyFallback) {
      if (n.getBranchKind() != null) {
        return n.getBranchKind() == BranchKind.BRANCH ? n.getLaneKey() : null;
      }
      return legacyFallback;
    }

    private static List<String> splitSubTopics(String value) {
      if (value == null || value.isBlank()) return List.of();
      return Arrays.stream(value.split("[,;|]"))
          .map(String::trim)
          .filter(s -> !s.isEmpty())
          .toList();
    }
  }
}
